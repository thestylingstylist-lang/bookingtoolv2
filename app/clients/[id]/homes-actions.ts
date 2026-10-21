"use server"

import { revalidatePath } from "next/cache"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { addressFromLink } from "@/lib/listing-link"
import { formatInTimeZone } from "date-fns-tz"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { agentCard } from "@/lib/agent-card"
import { offerEmail, type OfferTerms } from "@/lib/offer-email"

export type HomeResult = { ok: boolean; message?: string }

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, userId: user?.id ?? null }
}
const s = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max)

// Paste a link or type an address.
export async function addHome(_prev: HomeResult | null, formData: FormData): Promise<HomeResult> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false, message: "Please sign in again." }
  const clientId = s(formData.get("clientId"), 60)
  const input = s(formData.get("home"), 600)
  if (!input) return { ok: false, message: "Paste a link or type an address." }

  const isLink = /^https?:\/\//i.test(input)
  const address = isLink ? addressFromLink(input) : input
  if (!address) return { ok: false, message: "We couldn't read an address from that link. Type the address instead." }

  const { error } = await supabase.from("homes").insert({
    agent_id: userId,
    client_id: clientId,
    address: address.slice(0, 200),
    listing_url: isLink ? input : "",
  })
  if (error) return { ok: false, message: "Couldn't add that home. Try again." }
  revalidatePath(`/clients/${clientId}`)
  return { ok: true }
}

// Everything in the house panel saves together.
export async function saveHome(_prev: HomeResult | null, formData: FormData): Promise<HomeResult> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false, message: "Please sign in again." }
  const id = s(formData.get("homeId"), 60)
  const { data: home } = await supabase.from("homes").select("id, client_id, event_id, address").eq("id", id).maybeSingle()
  if (!home) return { ok: false, message: "That home is gone. Refresh the page." }

  const { data: agent } = await supabase.from("agents").select("timezone").eq("id", userId).maybeSingle()
  const tz = (agent?.timezone as string) || "America/New_York"

  const address = s(formData.get("address"), 200) || (home.address as string)
  let listingUrl = s(formData.get("listingUrl"), 600)
  if (listingUrl && !/^https?:\/\//i.test(listingUrl)) listingUrl = `https://${listingUrl}`

  // Showing time -> also on the calendar, so it's never in two places.
  const date = s(formData.get("showDate"), 10)
  const time = s(formData.get("showTime"), 5)
  if (!!date !== !!time) return { ok: false, message: "Add both a date and a time for the showing." }
  let showingAt: string | null = null
  if (date && time) showingAt = fromZonedTime(`${date}T${time}:00`, tz).toISOString()
  let eventId = (home.event_id as string | null) ?? null
  if (showingAt) {
    const ends = new Date(new Date(showingAt).getTime() + 60 * 60 * 1000).toISOString()
    if (eventId) {
      await supabase.from("events").update({ starts_at: showingAt, ends_at: ends, place: address }).eq("id", eventId)
    } else {
      const { data: ev } = await supabase
        .from("events")
        .insert({ agent_id: userId, client_id: home.client_id, kind: "showing", place: address, starts_at: showingAt, ends_at: ends })
        .select("id")
        .maybeSingle()
      eventId = (ev?.id as string) ?? null
    }
  } else if (eventId) {
    await supabase.from("events").delete().eq("id", eventId)
    eventId = null
  }

  const { error } = await supabase
    .from("homes")
    .update({
      address,
      listing_url: listingUrl,
      agent_name: s(formData.get("agentName"), 120),
      agent_brokerage: s(formData.get("agentBrokerage"), 120),
      agent_email: s(formData.get("agentEmail"), 200),
      agent_phone: s(formData.get("agentPhone"), 40),
      notes: s(formData.get("notes"), 2000),
      showing_at: showingAt,
      event_id: eventId,
    })
    .eq("id", id)
  if (error) return { ok: false, message: "Couldn't save. Try again." }
  revalidatePath(`/clients/${home.client_id}`)
  revalidatePath("/calendar")
  return { ok: true, message: "Saved." }
}

// Passed on it, or bring it back.
export async function setHomeStatus(homeId: string, status: "active" | "passed"): Promise<void> {
  const { supabase, userId } = await me()
  if (!userId) return
  const { data: home } = await supabase.from("homes").update({ status }).eq("id", homeId).select("client_id").maybeSingle()
  if (home) revalidatePath(`/clients/${home.client_id}`)
}

export async function removeHome(homeId: string): Promise<void> {
  const { supabase, userId } = await me()
  if (!userId) return
  const { data: home } = await supabase.from("homes").select("client_id, event_id").eq("id", homeId).maybeSingle()
  if (!home) return
  if (home.event_id) await supabase.from("events").delete().eq("id", home.event_id)
  await supabase.from("homes").delete().eq("id", homeId)
  revalidatePath(`/clients/${home.client_id}`)
  revalidatePath("/calendar")
}

// ---- Offers ----------------------------------------------------------------


const usd = (n: number | null) => (n == null ? "" : `$${Math.round(n).toLocaleString("en-US")}`)
const num = (v: FormDataEntryValue | null) => {
  const d = String(v ?? "").replace(/[^0-9.]/g, "")
  return d ? Math.min(Number(d), 2_000_000_000) : null
}
const FINANCING = ["Conventional", "FHA", "VA", "Cash"]
const CONTINGENCIES = ["Inspection", "Appraisal", "Mortgage", "Home sale"]

async function agentBits(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: a }, { data: u }] = await Promise.all([
    supabase.from("agents").select("full_name, business_name, timezone, public_email").eq("id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ])
  return {
    name: ((a?.full_name as string) || (a?.business_name as string) || "").trim(),
    tz: (a?.timezone as string) || "America/New_York",
    replyTo: ((a?.public_email as string) || u.user?.email || "").trim(),
  }
}

function termsFor(
  home: { address: string },
  buyer: string,
  o: { amount: number; deposit: number | null; financing: string; contingencies: string[]; closing_on: string | null; good_until: string | null },
  tz: string,
): OfferTerms {
  return {
    street: home.address.split(",")[0],
    address: home.address,
    buyer,
    amount: usd(o.amount),
    deposit: usd(o.deposit),
    financing: o.financing,
    contingencies: o.contingencies.length ? o.contingencies.join(", ") : "None",
    closing: o.closing_on ? formatInTimeZone(new Date(`${o.closing_on}T12:00:00Z`), "UTC", "MMMM d, yyyy") : "",
    goodUntil: o.good_until ? formatInTimeZone(new Date(o.good_until), tz, "EEEE, MMMM d 'at' h:mm a").replace(":00 ", " ") : "",
  }
}

export async function sendOffer(_prev: HomeResult | null, formData: FormData): Promise<HomeResult> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false, message: "Please sign in again." }
  const homeId = s(formData.get("homeId"), 60)
  const { data: home } = await supabase.from("homes").select("id, client_id, address").eq("id", homeId).maybeSingle()
  if (!home) return { ok: false, message: "That home is gone. Refresh the page." }

  const agentName = s(formData.get("agentName"), 120)
  const agentEmail = s(formData.get("agentEmail"), 200)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) return { ok: false, message: "Add the listing agent's email so the offer can go out." }
  const amount = num(formData.get("amount"))
  if (!amount) return { ok: false, message: "Add the offer price." }
  const deposit = num(formData.get("deposit"))
  const financing = FINANCING.includes(s(formData.get("financing"), 20)) ? s(formData.get("financing"), 20) : "Conventional"
  const contingencies = formData.getAll("contingency").map(String).filter((c) => CONTINGENCIES.includes(c))
  const closingOn = s(formData.get("closingOn"), 10) || null
  const me2 = await agentBits(supabase, userId)
  const gd = s(formData.get("goodDate"), 10)
  const gt = s(formData.get("goodTime"), 5) || "17:00"
  const goodUntil = gd ? fromZonedTime(`${gd}T${gt}:00`, me2.tz).toISOString() : null
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000)

  // Keep the listing agent on the home for next time.
  await supabase
    .from("homes")
    .update({
      agent_name: agentName,
      agent_brokerage: s(formData.get("agentBrokerage"), 120),
      agent_email: agentEmail,
      agent_phone: s(formData.get("agentPhone"), 40),
    })
    .eq("id", homeId)

  const { data: client } = await supabase.from("clients").select("first_name, last_name").eq("id", home.client_id).maybeSingle()
  const buyer = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim()

  const { data: offer, error } = await supabase
    .from("home_offers")
    .insert({
      agent_id: userId,
      client_id: home.client_id,
      home_id: homeId,
      amount,
      deposit,
      financing,
      contingencies,
      closing_on: closingOn,
      good_until: goodUntil,
    })
    .select("id")
    .maybeSingle()
  if (error || !offer) return { ok: false, message: "Couldn't save the offer. Try again." }

  // The client's documents ride along, by private link.
  const docIds = formData.getAll("doc").map(String).slice(0, 10)
  const attachments: { filename: string; path: string }[] = []
  if (docIds.length) {
    const { data: docs } = await supabase
      .from("collected_docs")
      .select("id, title, file_path, file_name")
      .eq("client_id", home.client_id)
      .in("id", docIds)
    const admin = createAdminClient()
    for (const d of docs ?? []) {
      if (!d.file_path) continue
      const { data } = await admin.storage.from("client-docs").createSignedUrl(d.file_path as string, 60 * 60)
      if (data?.signedUrl) attachments.push({ filename: (d.file_name as string) || `${d.title}.pdf`, path: data.signedUrl })
    }
  }

  const mail = offerEmail({
    agentName: me2.name,
    message,
    terms: termsFor(home as { address: string }, buyer, { amount, deposit, financing, contingencies, closing_on: closingOn, good_until: goodUntil }, me2.tz),
  })
  const sent = await sendEmail({
    to: agentEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    fromName: me2.name,
    replyTo: me2.replyTo || undefined,
    card: await agentCard(userId),
    attachments,
  })
  if (!sent) {
    await supabase.from("home_offers").delete().eq("id", offer.id)
    return { ok: false, message: "The email didn't go out. Nothing was sent. Try again." }
  }

  revalidatePath(`/clients/${home.client_id}`)
  return { ok: true, message: `Offer sent to ${agentName || agentEmail}.` }
}

export async function followUpOffer(_prev: HomeResult | null, formData: FormData): Promise<HomeResult> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false, message: "Please sign in again." }
  const offerId = s(formData.get("offerId"), 60)
  const { data: offer } = await supabase
    .from("home_offers")
    .select("id, client_id, home_id, amount, deposit, financing, contingencies, closing_on, good_until")
    .eq("id", offerId)
    .maybeSingle()
  if (!offer) return { ok: false, message: "That offer is gone. Refresh the page." }
  const { data: home } = await supabase.from("homes").select("address, agent_email, agent_name").eq("id", offer.home_id).maybeSingle()
  if (!home?.agent_email) return { ok: false, message: "Add the listing agent's email first." }
  const { data: client } = await supabase.from("clients").select("first_name, last_name").eq("id", offer.client_id).maybeSingle()
  const me2 = await agentBits(supabase, userId)
  const mail = offerEmail({
    agentName: me2.name,
    message: String(formData.get("message") ?? "").slice(0, 4000),
    followUp: true,
    terms: termsFor(home as { address: string }, `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim(), offer as never, me2.tz),
  })
  const sent = await sendEmail({
    to: home.agent_email as string,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    fromName: me2.name,
    replyTo: me2.replyTo || undefined,
    card: await agentCard(userId),
  })
  if (!sent) return { ok: false, message: "The email didn't go out. Try again." }
  await supabase.from("home_offers").update({ followed_up_at: new Date().toISOString() }).eq("id", offerId)
  revalidatePath(`/clients/${offer.client_id}`)
  return { ok: true, message: `Sent to ${(home.agent_name as string) || home.agent_email}.` }
}

export async function setOfferStatus(offerId: string, status: "sent" | "countered" | "accepted" | "declined"): Promise<void> {
  const { supabase, userId } = await me()
  if (!userId) return
  const { data } = await supabase.from("home_offers").update({ status }).eq("id", offerId).select("client_id").maybeSingle()
  if (data) revalidatePath(`/clients/${data.client_id}`)
}
