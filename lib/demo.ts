import "server-only"
import { fromZonedTime, formatInTimeZone } from "date-fns-tz"
import { PHASES, type Phase } from "./phases"
import { AGENT_DEFAULTS } from "./config"
import type { createAdminClient } from "./supabase/admin"

// A clean, believable demo account for sales demos: one agent, four clients at different stages,
// upcoming bookings, a signed agreement, homes, an offer, and a client waiting on a reply.
// Every name and number is made up. Only the team creates it, from Admin.
export const DEMO_EMAIL = "demo@marvberry.com"
// Admin numbers leave this business out, so the demo never counts as a real agent.
export const DEMO_BUSINESS = "Bennett Home Group"
const TZ = "America/New_York"

type Admin = ReturnType<typeof createAdminClient>

const day = (offset: number) => formatInTimeZone(new Date(Date.now() + offset * 86400000), TZ, "yyyy-MM-dd")
const at = (offset: number, hhmm: string) => fromZonedTime(`${day(offset)}T${hhmm}:00`, TZ).toISOString()
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString()

const AGREEMENT = `Buyer Agency Agreement

This agreement is between Nicole Bennett of Bennett Home Group ("Agent") and Jordan Taylor ("Buyer").

1. Term
This agreement starts today and ends in 90 days, unless both parties agree in writing to end it sooner.

2. Type of agreement
This is an exclusive agreement. Buyer agrees to work only with Agent to buy a home during the term.

3. Services
Agent will help Buyer find, view, and buy a home, share what Agent knows about homes Buyer is considering, help prepare and present offers, and guide Buyer through closing.

4. Compensation
Agent's compensation is 2.5% of the purchase price, paid when Buyer closes on a home.

Broker compensation is not set by law and is fully negotiable.`

export async function seedDemo(admin: Admin, agentId: string): Promise<string[]> {
  const problems: string[] = []
  const run = async (label: string, fn: () => PromiseLike<{ error: unknown }>) => {
    try {
      const { error } = await fn()
      if (error) problems.push(label)
    } catch {
      problems.push(label)
    }
  }

  // The agent
  await run("agent profile", () =>
    admin
      .from("agents")
      .update({
        tagline: "Helping first-time buyers feel at home",
        welcome_message: "Thinking about buying or selling? Book a free consultation and let's map out your next move together.",
        public_phone: "(555) 010-0142",
        subscription_status: "active",
      })
      .eq("id", agentId),
  )

  // Setup is already done, so the demo never shows "Book your free setup call".
  await run("setup done", () =>
    admin.from("onboarding").upsert({ agent_id: agentId, owner: "Alecia", completed_at: new Date().toISOString() }, { onConflict: "agent_id" }),
  )

  // Upcoming consultations from the booking link
  const bookings = [
    { first_name: "Jordan", last_name: "Taylor", email: "jordan.taylor@example.com", phone: "(555) 010-0118", meeting_type: "virtual", slot_start: at(-9, "10:00"), looking_to: "Buy", notes: "First home. Hoping to be in by spring." },
    { first_name: "Marcus", last_name: "Lee", email: "marcus.lee@example.com", phone: "(555) 010-0110", meeting_type: "virtual", slot_start: at(1, "10:00"), looking_to: "Buy", notes: "Relocating for work in March." },
    { first_name: "Ava", last_name: "Morales", email: "ava.morales@example.com", phone: "(555) 010-0133", meeting_type: "phone", slot_start: at(2, "14:30"), looking_to: "Buy and sell", notes: "" },
    { first_name: "Dana", last_name: "Whitfield", email: "dana.whitfield@example.com", phone: "(555) 010-0150", meeting_type: "phone", slot_start: at(3, "11:00"), looking_to: "Sell", notes: "" },
  ]
  let jordanBooking: string | null = null
  for (const b of bookings) {
    const { data, error } = await admin.from("bookings").insert({ agent_id: agentId, ...b }).select("id").maybeSingle()
    if (error) problems.push(`booking ${b.first_name}`)
    if (b.first_name === "Jordan") jordanBooking = (data?.id as string) ?? null
  }

  // Clients at different stages of the deal
  const people: { first: string; last: string; email: string; phone: string; phase: Phase; done: number; booking?: string | null }[] = [
    { first: "Jordan", last: "Taylor", email: "jordan.taylor@example.com", phone: "(555) 010-0118", phase: "showing", done: 3, booking: jordanBooking },
    { first: "Priya", last: "Nair", email: "priya.nair@example.com", phone: "(555) 010-0164", phase: "offer", done: 2 },
    { first: "Riley", last: "Carter", email: "riley.carter@example.com", phone: "(555) 010-0191", phase: "closing", done: 3 },
    { first: "Sam", last: "Okafor", email: "sam.okafor@example.com", phone: "(555) 010-0127", phase: "showing", done: 1 },
  ]
  const ids: Record<string, string> = {}
  for (const p of people) {
    const { data, error } = await admin
      .from("clients")
      .insert({ agent_id: agentId, first_name: p.first, last_name: p.last, email: p.email, phone: p.phone, booking_id: p.booking ?? null })
      .select("id")
      .maybeSingle()
    if (error || !data?.id) {
      problems.push(`client ${p.first}`)
      continue
    }
    const id = data.id as string
    ids[p.first] = id
    await run(`${p.first}'s stage`, () => admin.from("clients").update({ phase: p.phase, client_type: "buyer" }).eq("id", id))

    // Steps for every phase up to theirs: earlier phases done, current phase partly done.
    const upto = PHASES.findIndex((x) => x.key === p.phase)
    const rows = PHASES.slice(0, upto + 1).flatMap((ph, pi) =>
      ph.steps.map((s, position) => {
        const current = pi === upto
        const done = !current || position < p.done
        return {
          agent_id: agentId,
          client_id: id,
          title: s.title,
          owner: s.owner,
          phase: ph.key,
          position,
          done,
          due_on: !done && position <= p.done + 1 ? day(position - p.done + 1) : null,
        }
      }),
    )
    await run(`${p.first}'s steps`, () => admin.from("steps").insert(rows))
  }

  // Jordan: signed agreement, homes, a showing, and a question waiting on a reply.
  if (ids.Jordan) {
    const c = ids.Jordan
    await run("signed agreement", () =>
      admin.from("documents").insert({
        agent_id: agentId,
        client_id: c,
        kind: "agreement",
        title: "Buyer Agreement",
        body: AGREEMENT,
        status: "signed",
        signer_name: "Jordan Taylor",
        signed_at: ago(60 * 26),
      }),
    )
    await run("Jordan's homes", () =>
      admin.from("homes").insert([
        { agent_id: agentId, client_id: c, address: "14 Maple Ave, Westfield, NJ 07090", listing_url: "", status: "active", showing_at: at(1, "11:30") },
        { agent_id: agentId, client_id: c, address: "61 Orchard St, Cranford, NJ 07016", listing_url: "", status: "active", showing_at: at(3, "16:00") },
      ]),
    )
    await run("showing", () =>
      admin.from("events").insert({ agent_id: agentId, client_id: c, kind: "showing", place: "14 Maple Ave, Westfield", starts_at: at(1, "11:30"), ends_at: at(1, "12:15") }),
    )
    await run("Jordan's messages", () =>
      admin.from("messages").insert([
        { agent_id: agentId, client_id: c, sender: "agent", body: "Hi Jordan! Your page is all set. Everything we're working on lives here, so you'll always know what's next.", created_at: ago(60 * 30) },
        { agent_id: agentId, client_id: c, sender: "client", body: "This is so easy, thank you! I just signed the agreement.", created_at: ago(60 * 26) },
        { agent_id: agentId, client_id: c, sender: "client", body: "Are we still on for tomorrow at 11:30? Should I bring anything to the showing?", created_at: ago(40) },
      ]),
    )
  }

  // Priya: an offer out on a home.
  if (ids.Priya) {
    const c = ids.Priya
    const { data: home, error } = await admin
      .from("homes")
      .insert({ agent_id: agentId, client_id: c, address: "18 Elm Rd, Summit, NJ 07901", listing_url: "", agent_name: "David Chen", agent_brokerage: "Summit Realty Group", status: "active" })
      .select("id")
      .maybeSingle()
    if (error || !home?.id) problems.push("Priya's home")
    else
      await run("Priya's offer", () =>
        admin.from("home_offers").insert({ agent_id: agentId, client_id: c, home_id: home.id, amount: 545000, status: "sent", good_until: at(1, "17:00") }),
      )
    await run("Priya's messages", () =>
      admin.from("messages").insert([
        { agent_id: agentId, client_id: c, sender: "agent", body: "Your offer on 18 Elm Rd is in. I'll let you know the moment I hear back.", created_at: ago(60 * 5) },
        { agent_id: agentId, client_id: c, sender: "client", body: "Fingers crossed!! Thank you for moving so fast.", created_at: ago(60 * 4) },
      ]),
    )
  }

  // Riley: closing on the calendar.
  if (ids.Riley)
    await run("closing", () =>
      admin.from("events").insert({ agent_id: agentId, client_id: ids.Riley, kind: "closing", place: "Harbor Title, 20 Main Street", starts_at: at(5, "13:30"), ends_at: at(5, "14:30") }),
    )

  return problems
}

// The agent row for the demo login, set up the same way a real signup is.
export function demoAgentRow(id: string) {
  return {
    id,
    business_name: DEMO_BUSINESS,
    full_name: "Nicole Bennett",
    timezone: TZ,
    weekdays: AGENT_DEFAULTS.weekdays,
    day_start: AGENT_DEFAULTS.startHour,
    day_end: AGENT_DEFAULTS.endHour,
    slot_minutes: AGENT_DEFAULTS.slotMinutes,
    days_ahead: AGENT_DEFAULTS.daysAhead,
    min_notice_hours: AGENT_DEFAULTS.minNoticeHours,
    show_contact: AGENT_DEFAULTS.showContact,
  }
}
