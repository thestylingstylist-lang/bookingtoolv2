"use server"

import { revalidatePath } from "next/cache"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { addressFromLink } from "@/lib/listing-link"

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
