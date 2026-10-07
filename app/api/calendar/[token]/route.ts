import { createAdminClient } from "@/lib/supabase/admin"
import { readFeedToken } from "@/lib/feed"
import { kindMeta } from "@/lib/events"

export const dynamic = "force-dynamic"

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
const nextDay = (ymd: string) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, "")
}

// The realtor's Marvberry calendar, as a feed their phone can follow.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const agentId = readFeedToken(token)
  if (!agentId) return new Response("Not found", { status: 404 })

  const admin = createAdminClient()
  const since = new Date(Date.now() - 60 * 86400000).toISOString()
  const [{ data: agent }, { data: bookings }, { data: steps }, { data: events }] = await Promise.all([
    admin.from("agents").select("slot_minutes").eq("id", agentId).maybeSingle(),
    admin
      .from("bookings")
      .select("id, first_name, last_name, email, phone, meeting_type, slot_start, notes")
      .eq("agent_id", agentId)
      .gte("slot_start", since)
      .order("slot_start", { ascending: true }),
    admin
      .from("steps")
      .select("id, title, due_on, clients(first_name)")
      .eq("agent_id", agentId)
      .eq("done", false)
      .not("due_on", "is", null),
    admin
      .from("events")
      .select("id, kind, place, starts_at, ends_at, clients(first_name, last_name)")
      .eq("agent_id", agentId)
      .gte("starts_at", since),
  ])
  if (!agent) return new Response("Not found", { status: 404 })

  const minutes = agent.slot_minutes || 30
  const now = stamp(new Date())
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Marvberry//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Marvberry",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ]

  for (const b of bookings ?? []) {
    const start = new Date(b.slot_start)
    const end = new Date(start.getTime() + minutes * 60000)
    const name = `${b.first_name} ${b.last_name}`.trim()
    const how = b.meeting_type === "phone" ? "Phone call" : "Video call"
    const details = [how, b.phone, b.email, b.notes].filter(Boolean).join("\n")
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${b.id}@marvberry.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Consultation with ${name}`)}`,
      `DESCRIPTION:${esc(details)}`,
      "END:VEVENT"
    )
  }

  type Ev = { id: string; kind: string; place: string; starts_at: string; ends_at: string; clients: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[] | null }
  for (const e of (events ?? []) as unknown as Ev[]) {
    const c = Array.isArray(e.clients) ? e.clients[0] : e.clients
    const who = c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : ""
    const label = kindMeta(e.kind).label
    lines.push(
      "BEGIN:VEVENT",
      `UID:event-${e.id}@marvberry.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(new Date(e.starts_at))}`,
      `DTEND:${stamp(new Date(e.ends_at))}`,
      `SUMMARY:${esc([label, who ? `with ${who}` : ""].filter(Boolean).join(" "))}`,
      ...(e.place ? [`LOCATION:${esc(e.place)}`] : []),
      "END:VEVENT"
    )
  }

  type StepRow = { id: string; title: string; due_on: string; clients: { first_name: string | null } | { first_name: string | null }[] | null }
  for (const s of (steps ?? []) as unknown as StepRow[]) {
    const c = Array.isArray(s.clients) ? s.clients[0] : s.clients
    const first = c?.first_name?.trim() || "Client"
    lines.push(
      "BEGIN:VEVENT",
      `UID:step-${s.id}@marvberry.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${s.due_on.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${nextDay(s.due_on)}`,
      `SUMMARY:${esc(`Due: ${first}, ${s.title}`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    )
  }

  lines.push("END:VCALENDAR", "")
  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="marvberry.ics"',
      "cache-control": "no-store",
    },
  })
}
