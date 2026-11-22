import "server-only"
import { randomBytes } from "crypto"
import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { kindMeta } from "@/lib/events"
import { sendEmail } from "@/lib/email"
import { agentCard } from "@/lib/agent-card"
import { suiteLetter, sPara, sWhen, sLink, sLinkLine, sSmall, teamNote, para, esc } from "@/lib/letter"
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar"
import { notifyAgent } from "@/lib/notify"

// Diana arranges meetings: she reads the agent's calendar, offers open times,
// holds them while the client chooses, and books the one they pick.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any; auth?: any }

export type MeetKind = "phone" | "in_person" | "video"
export const toMeetKind = (v: unknown): MeetKind | null => (v === "phone" || v === "in_person" || v === "video" ? v : null)

const SITE = "https://www.marvberry.com"
const HOLD_HOURS = 48

export type MeetAgent = {
  id: string
  full_name: string | null
  business_name: string | null
  slug: string | null
  timezone: string
  weekdays: number[]
  day_start: number
  day_end: number
  slot_minutes: number
  min_notice_hours: number
  meeting_link: string
  public_phone: string | null
  public_email: string | null
  call_minutes: number
  inperson_minutes: number
}

export async function loadMeetAgent(db: Db, id: string): Promise<MeetAgent | null> {
  const { data } = await db
    .from("agents")
    .select("id, full_name, business_name, slug, timezone, weekdays, day_start, day_end, slot_minutes, min_notice_hours, public_phone, public_email")
    .eq("id", id)
    .maybeSingle()
  if (!data) return null
  // Columns that arrive with later updates; the agent still works without them.
  const { data: extra } = await db.from("agents").select("meeting_link").eq("id", id).maybeSingle()
  const { data: len } = await db.from("agents").select("meeting_call_minutes, meeting_inperson_minutes").eq("id", id).maybeSingle()
  return {
    ...data,
    timezone: data.timezone || "America/New_York",
    weekdays: data.weekdays?.length ? data.weekdays : [1, 2, 3, 4, 5],
    day_start: data.day_start ?? 9,
    day_end: data.day_end ?? 17,
    meeting_link: extra?.meeting_link ?? "",
    call_minutes: len?.meeting_call_minutes ?? 30,
    inperson_minutes: len?.meeting_inperson_minutes ?? 60,
  }
}

export const firstOf = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] ?? ""

// "Tuesday, December 1 at 10:00 AM"
export const whenLabel = (iso: string, tz: string) => formatInTimeZone(new Date(iso), tz, "EEEE, MMMM d 'at' h:mm a")
// "Tuesday at 10:00 AM"
export const shortWhen = (iso: string, tz: string) => formatInTimeZone(new Date(iso), tz, "EEEE 'at' h:mm a")
const clock = (ms: number, tz: string) => formatInTimeZone(new Date(ms), tz, "h:mm a")

export function kindPhrase(kind: MeetKind, place: string) {
  if (kind === "phone") return "a phone call"
  if (kind === "video") return "a video call"
  return place ? `in person at ${place}` : "in person"
}

// ---------------------------------------------------------------- calendar

type Item = { start: number; end: number; label: string }

// Everything already on the agent's calendar between two instants.
export async function calendarItems(db: Db, agentId: string, from: Date, to: Date, skipInvite?: string): Promise<Item[]> {
  const items: Item[] = []
  const fromISO = from.toISOString()
  const toISO = to.toISOString()
  const { data: events } = await db
    .from("events")
    .select("kind, place, starts_at, ends_at, clients(first_name, last_name)")
    .eq("agent_id", agentId)
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
  for (const e of (events ?? []) as { kind: string; place: string; starts_at: string; ends_at: string; clients: { first_name: string } | null }[]) {
    const who = e.clients?.first_name ? ` with ${e.clients.first_name}` : ""
    const label = e.kind === "hold" ? `Personal time${e.place ? ` (${e.place})` : ""}` : `${kindMeta(e.kind).label}${who}${e.place ? `, ${e.place}` : ""}`
    items.push({ start: Date.parse(e.starts_at), end: Date.parse(e.ends_at), label })
  }
  const { data: agent } = await db.from("agents").select("slot_minutes").eq("id", agentId).maybeSingle()
  const len = (agent?.slot_minutes ?? 30) * 60000
  const { data: bookings } = await db
    .from("bookings")
    .select("slot_start, first_name, last_name")
    .eq("agent_id", agentId)
    .gte("slot_start", new Date(from.getTime() - len).toISOString())
    .lt("slot_start", toISO)
  for (const b of (bookings ?? []) as { slot_start: string; first_name: string; last_name: string }[]) {
    const s = Date.parse(b.slot_start)
    items.push({ start: s, end: s + len, label: `Consultation with ${b.first_name} ${b.last_name}`.trim() })
  }
  const { data: held } = await db
    .from("meeting_options")
    .select("invite_id, starts_at, ends_at, meeting_invites!inner(status, clients(first_name))")
    .eq("agent_id", agentId)
    .is("released_at", null)
    .eq("meeting_invites.status", "waiting")
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
  for (const h of (held ?? []) as { invite_id: string; starts_at: string; ends_at: string; meeting_invites: { clients: { first_name: string } | null } }[]) {
    if (skipInvite && h.invite_id === skipInvite) continue
    const who = h.meeting_invites?.clients?.first_name
    items.push({ start: Date.parse(h.starts_at), end: Date.parse(h.ends_at), label: `Held for ${who ?? "a client"}` })
  }
  return items.sort((a, b) => a.start - b.start)
}

// The agent's working hours on one calendar day, or null on a day off.
function workday(a: MeetAgent, dateStr: string): [number, number] | null {
  const noon = fromZonedTime(`${dateStr}T12:00:00`, a.timezone)
  const weekday = Number(formatInTimeZone(noon, a.timezone, "i"))
  if (!a.weekdays.includes(weekday)) return null
  const at = (h: number) => {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return fromZonedTime(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`, a.timezone).getTime()
  }
  return [at(a.day_start), at(a.day_end)]
}

function days(a: MeetAgent, fromDate: string | undefined, toDate: string | undefined, defaultDays: number) {
  const today = formatInTimeZone(new Date(), a.timezone, "yyyy-MM-dd")
  const start = fromDate && fromDate >= today ? fromDate : today
  const startNoon = fromZonedTime(`${start}T12:00:00`, a.timezone)
  const out: string[] = []
  for (let i = 0; i < 31; i++) {
    const d = formatInTimeZone(addDays(startNoon, i), a.timezone, "yyyy-MM-dd")
    if (toDate ? d > toDate : i >= defaultDays) break
    out.push(d)
  }
  return out
}

// A plain picture of the agent's days: working hours, what's booked, what's free.
export async function availability(db: Db, a: MeetAgent, fromDate?: string, toDate?: string) {
  const list = days(a, fromDate, toDate, 7)
  if (!list.length) return []
  const from = fromZonedTime(`${list[0]}T00:00:00`, a.timezone)
  const to = fromZonedTime(`${list[list.length - 1]}T23:59:59`, a.timezone)
  const items = await calendarItems(db, a.id, from, to)
  const now = Date.now()
  return list.map((d) => {
    const label = formatInTimeZone(fromZonedTime(`${d}T12:00:00`, a.timezone), a.timezone, "EEEE, MMMM d")
    const w = workday(a, d)
    const dayItems = items.filter((i) => {
      const s = fromZonedTime(`${d}T00:00:00`, a.timezone).getTime()
      return i.start < s + 86400000 && i.end > s
    })
    const busy = dayItems.map((i) => `${clock(i.start, a.timezone)} to ${clock(i.end, a.timezone)}: ${i.label}`)
    if (!w) return { day: label, working: "Not a working day", busy, free: [] as string[] }
    const free: string[] = []
    let cursor = Math.max(w[0], now)
    for (const i of dayItems) {
      if (i.start > cursor && i.start <= w[1]) free.push(`${clock(cursor, a.timezone)} to ${clock(Math.min(i.start, w[1]), a.timezone)}`)
      cursor = Math.max(cursor, i.end)
    }
    if (cursor < w[1]) free.push(`${clock(cursor, a.timezone)} to ${clock(w[1], a.timezone)}`)
    return { day: label, working: `${clock(w[0], a.timezone)} to ${clock(w[1], a.timezone)}`, busy, free }
  })
}

export type OpenTime = { startISO: string; label: string }

// Open times of the right length inside working hours, spread across days.
export async function openTimes(db: Db, a: MeetAgent, minutes: number, fromDate?: string, toDate?: string): Promise<OpenTime[]> {
  const list = days(a, fromDate, toDate, 10)
  if (!list.length) return []
  const from = fromZonedTime(`${list[0]}T00:00:00`, a.timezone)
  const to = fromZonedTime(`${list[list.length - 1]}T23:59:59`, a.timezone)
  const items = await calendarItems(db, a.id, from, to)
  // Give the client time to see the invitation and answer.
  const earliest = Date.now() + Math.max(12, Math.min(a.min_notice_hours ?? 24, 24)) * 3600000
  const len = minutes * 60000
  const perDay: OpenTime[][] = []
  for (const d of list) {
    const w = workday(a, d)
    if (!w) continue
    const found: OpenTime[] = []
    for (let s = w[0]; s + len <= w[1]; s += 30 * 60000) {
      if (s < earliest) continue
      // A little room either side, so meetings don't run into each other.
      if (items.some((i) => s - 15 * 60000 < i.end && s + len + 15 * 60000 > i.start)) continue
      found.push({ startISO: new Date(s).toISOString(), label: whenLabel(new Date(s).toISOString(), a.timezone) })
    }
    if (found.length) perDay.push(found)
  }
  // One good time per day first (mid-morning or early afternoon), then a second round.
  const pickNice = (xs: OpenTime[], used: Set<string>) => {
    const score = (o: OpenTime) => {
      const h = Number(formatInTimeZone(new Date(o.startISO), a.timezone, "H")) + Number(formatInTimeZone(new Date(o.startISO), a.timezone, "m")) / 60
      return Math.min(Math.abs(h - 10), Math.abs(h - 14))
    }
    return xs.filter((x) => !used.has(x.startISO)).sort((p, q) => score(p) - score(q))[0]
  }
  const used = new Set<string>()
  const out: OpenTime[] = []
  for (let round = 0; round < 2 && out.length < 6; round++) {
    for (const xs of perDay) {
      const p = pickNice(xs, used)
      if (p && out.length < 6) {
        used.add(p.startISO)
        out.push(p)
      }
    }
  }
  return out.sort((p, q) => p.startISO.localeCompare(q.startISO))
}

// ---------------------------------------------------------------- sending

export async function sendInvite(
  db: Db,
  agentId: string,
  o: { clientId: string; startISOs: string[]; minutes: number; kind: MeetKind; place: string; message: string },
): Promise<{ ok: true; holdUntil: string; first: string } | { ok: false; message: string }> {
  const a = await loadMeetAgent(db, agentId)
  if (!a) return { ok: false, message: "Your session ended. Sign in again." }
  const { data: client } = await db.from("clients").select("id, first_name, last_name, email").eq("id", o.clientId).eq("agent_id", agentId).maybeSingle()
  if (!client) return { ok: false, message: "That client isn't in your list." }
  const minutes = Math.min(Math.max(Math.round(o.minutes) || 30, 10), 240)
  const times = [...new Set(o.startISOs)].filter((s) => !isNaN(Date.parse(s))).sort().slice(0, 4)
  if (!times.length) return { ok: false, message: "Pick at least one time." }
  if (o.kind === "video" && !a.meeting_link) return { ok: false, message: "Add your video meeting link in Settings first, then send." }
  // Still open? Someone may have booked since Diana looked.
  const first = Date.parse(times[0])
  const last = Date.parse(times[times.length - 1]) + minutes * 60000
  const items = await calendarItems(db, agentId, new Date(first - 3600000), new Date(last + 3600000))
  for (const t of times) {
    const s = Date.parse(t)
    if (s < Date.now() + 3600000) return { ok: false, message: "One of those times is too soon now. Ask Diana for fresh times." }
    if (items.some((i) => s < i.end && s + minutes * 60000 > i.start))
      return { ok: false, message: "One of those times was just taken. Ask Diana for fresh times." }
  }

  const token = randomBytes(18).toString("base64url")
  const expires = new Date(Date.now() + HOLD_HOURS * 3600000)
  const place = o.kind === "in_person" ? o.place.trim().slice(0, 200) : ""
  const { data: invite, error } = await db
    .from("meeting_invites")
    .insert({
      agent_id: agentId,
      client_id: client.id,
      token,
      kind: o.kind,
      place,
      minutes,
      message: o.message.trim().slice(0, 2000),
      expires_at: expires.toISOString(),
    })
    .select("id")
    .single()
  if (error || !invite) return { ok: false, message: "Meetings aren't switched on for your account yet. Message us from Support, and we'll turn them on." }
  const { data: options, error: optErr } = await db
    .from("meeting_options")
    .insert(times.map((t) => ({ invite_id: invite.id, agent_id: agentId, starts_at: t, ends_at: new Date(Date.parse(t) + minutes * 60000).toISOString() })))
    .select("id, starts_at")
  if (optErr || !options) {
    await db.from("meeting_invites").delete().eq("id", invite.id)
    return { ok: false, message: "That didn't send. Try again in a moment." }
  }
  await db.from("messages").insert({ agent_id: agentId, client_id: client.id, sender: "agent", body: o.message.trim().slice(0, 2000), invite_id: invite.id })

  if (client.email) {
    const agentName = a.full_name || a.business_name || "Your agent"
    const opts = (options as { id: string; starts_at: string }[]).sort((p, q) => p.starts_at.localeCompare(q.starts_at))
    const buttons = opts
      .map(
        (op) =>
          `<p style="margin:12px 0 0;"><a href="${SITE}/meet/${token}?o=${op.id}" style="display:block;padding:14px 18px;border:1px solid #1F1E1C;border-radius:2px;font-family:Inter,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#1F1E1C;text-decoration:none;">${esc(whenLabel(op.starts_at, a.timezone))}</a></p>`,
      )
      .join("")
    const none = a.slug ? sLinkLine("None of these work?", `${SITE}/book/${a.slug}`, "Choose another time") : ""
    const html = suiteLetter({
      agentName,
      brokerage: a.business_name ?? undefined,
      heading: "Let&rsquo;s find a time",
      body: o.message.trim().split(/\n{2,}/).map((p) => sPara(esc(p).replace(/\n/g, "<br>"))).join("") + buttons + none,
      signoff: "Talk soon,",
      signature: firstOf(agentName),
    })
    const text = `${o.message.trim()}\n\n${opts.map((op) => `${whenLabel(op.starts_at, a.timezone)}: ${SITE}/meet/${token}?o=${op.id}`).join("\n")}${a.slug ? `\n\nNone of these work? Choose another time: ${SITE}/book/${a.slug}` : ""}`
    const { data: u } = db.auth ? await db.auth.admin.getUserById(agentId) : { data: null }
    await sendEmail({
      to: client.email,
      subject: `${agentName} would like to find a time with you`,
      html,
      text,
      fromName: agentName,
      card: await agentCard(agentId),
      replyTo: u?.user?.email ?? a.public_email ?? undefined,
    })
  }
  return { ok: true, holdUntil: formatInTimeZone(expires, a.timezone, "EEEE 'at' h:mm a"), first: client.first_name || "your client" }
}

// ---------------------------------------------------------------- choosing

export type InviteView = {
  status: "waiting" | "booked" | "expired" | "cancelled"
  agentName: string
  brokerage: string
  agentFirst: string
  clientFirst: string
  kind: MeetKind
  place: string
  minutes: number
  tz: string
  slug: string | null
  options: { id: string; startISO: string; label: string; open: boolean; chosen: boolean }[]
  token: string
}

export async function loadInvite(db: Db, token: string): Promise<(InviteView & { id: string; agentId: string; clientId: string; meetingLink: string }) | null> {
  if (!token || token.length > 64) return null
  const { data: inv } = await db
    .from("meeting_invites")
    .select("id, agent_id, client_id, kind, place, minutes, status, expires_at, clients(first_name)")
    .eq("token", token)
    .maybeSingle()
  if (!inv) return null
  const a = await loadMeetAgent(db, inv.agent_id)
  if (!a) return null
  const { data: opts } = await db.from("meeting_options").select("id, starts_at, released_at, chosen").eq("invite_id", inv.id).order("starts_at")
  const now = Date.now()
  let status = inv.status as InviteView["status"]
  const options = ((opts ?? []) as { id: string; starts_at: string; released_at: string | null; chosen: boolean }[]).map((o) => ({
    id: o.id,
    startISO: o.starts_at,
    label: whenLabel(o.starts_at, a.timezone),
    open: status === "waiting" && !o.released_at && Date.parse(o.starts_at) > now + 30 * 60000,
    chosen: o.chosen,
  }))
  if (status === "waiting" && (Date.parse(inv.expires_at) < now || !options.some((o) => o.open))) status = "expired"
  const agentName = a.full_name || a.business_name || "Your agent"
  return {
    id: inv.id,
    agentId: inv.agent_id,
    clientId: inv.client_id,
    meetingLink: a.meeting_link,
    status,
    agentName,
    brokerage: a.business_name && a.business_name !== agentName ? a.business_name : "",
    agentFirst: firstOf(agentName),
    clientFirst: (inv.clients as { first_name: string } | null)?.first_name ?? "",
    kind: inv.kind,
    place: inv.place,
    minutes: inv.minutes,
    tz: a.timezone,
    slug: a.slug,
    options,
    token,
  }
}

export function howLine(v: Pick<InviteView, "kind" | "place" | "agentFirst">, link?: string) {
  if (v.kind === "phone") return `${v.agentFirst} will call you.`
  if (v.kind === "video") return link ? `We'll meet by video: ${link}` : "We'll meet by video."
  return v.place ? `We'll meet at ${v.place}.` : "We'll meet in person."
}

export async function confirmChoice(db: Db, token: string, optionId: string): Promise<{ ok: true } | { ok: false; reason: "gone" | "taken" | "expired" }> {
  const v = await loadInvite(db, token)
  if (!v) return { ok: false, reason: "gone" }
  if (v.status === "booked") return v.options.find((o) => o.id === optionId)?.chosen ? { ok: true } : { ok: false, reason: "expired" }
  if (v.status !== "waiting") return { ok: false, reason: "expired" }
  const opt = v.options.find((o) => o.id === optionId)
  if (!opt || !opt.open) return { ok: false, reason: "expired" }
  const start = Date.parse(opt.startISO)
  const end = start + v.minutes * 60000
  const clash = await calendarItems(db, v.agentId, new Date(start - 60000), new Date(end + 60000), v.id)
  if (clash.some((i) => start < i.end && end > i.start)) {
    await db.from("meeting_options").update({ released_at: new Date().toISOString() }).eq("id", opt.id)
    return { ok: false, reason: "taken" }
  }
  // Claim it: only one choice can win.
  const { data: claimed } = await db
    .from("meeting_invites")
    .update({ status: "booked", closed_at: new Date().toISOString() })
    .eq("id", v.id)
    .eq("status", "waiting")
    .select("id")
  if (!claimed?.length) return { ok: false, reason: "expired" }
  const nowISO = new Date().toISOString()
  await db.from("meeting_options").update({ chosen: true }).eq("id", opt.id)
  await db.from("meeting_options").update({ released_at: nowISO }).eq("invite_id", v.id).neq("id", opt.id).is("released_at", null)
  const place = v.kind === "phone" ? "Phone call" : v.kind === "video" ? "Video call" : v.place
  const { data: ev } = await db
    .from("events")
    .insert({ agent_id: v.agentId, client_id: v.clientId, kind: "meeting", place, starts_at: opt.startISO, ends_at: new Date(end).toISOString() })
    .select("id")
    .maybeSingle()
  if (ev?.id) await db.from("meeting_invites").update({ event_id: ev.id }).eq("id", v.id)

  // The client's confirmation.
  const { data: client } = await db.from("clients").select("first_name, email").eq("id", v.clientId).maybeSingle()
  const cal = {
    title: `Meeting with ${v.agentName}`,
    details: `${kindPhrase(v.kind, v.place).replace(/^a /, "A ").replace(/^in person/, "In person")} with ${v.agentName}. ${howLine(v, v.meetingLink)}`,
    startISO: opt.startISO,
    minutes: v.minutes,
  }
  if (client?.email) {
    const hi = client.first_name ? `, ${esc(client.first_name)}` : ""
    const what = `${kindPhrase(v.kind, v.place).replace(/^a /, "A ").replace(/^in person/, "In person")} with ${esc(v.agentName)} &middot; ${v.minutes} minutes`
    const html = suiteLetter({
      agentName: v.agentName,
      brokerage: v.brokerage || undefined,
      heading: `You&rsquo;re booked${hi}.`,
      body:
        sPara("Thank you. Our meeting is set, and I look forward to it.") +
        sPara(esc(howLine(v, v.meetingLink))) +
        sWhen(esc(opt.label), what) +
        `<p style="margin:22px 0 0;font-family:Inter,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#67635C;">Add to calendar: ${sLink(googleCalendarUrl(cal), "Google")} &nbsp; ${sLink(`${SITE}/meet/${token}/ics`, "Apple")} &nbsp; ${sLink(outlookCalendarUrl(cal), "Outlook")}</p>` +
        sSmall("If something comes up, just reply to this email."),
      signoff: "Talk soon,",
      signature: v.agentFirst,
    })
    const text = `You're booked${client.first_name ? ", " + client.first_name : ""}.\n\nThank you. Our meeting is set, and I look forward to it.\n${howLine(v, v.meetingLink)}\n\nWhen: ${opt.label}\n${v.minutes} minutes\n\nAdd to calendar: ${googleCalendarUrl(cal)}\n\nIf something comes up, just reply to this email.\n\nTalk soon,\n${v.agentFirst}`
    const { data: u } = db.auth ? await db.auth.admin.getUserById(v.agentId) : { data: null }
    await sendEmail({
      to: client.email,
      subject: `Confirmed: ${opt.label} with ${v.agentName}`,
      html,
      text,
      fromName: v.agentName,
      card: await agentCard(v.agentId),
      replyTo: u?.user?.email ?? undefined,
    })
  }

  // The agent's heads-up.
  const who = client?.first_name || "Your client"
  const said = `${who} confirmed ${shortWhen(opt.startISO, v.tz)}`
  const notified = await notifyAgent(db, v.agentId, "bookings", { line: said, body: `${said}.`, url: `/clients/${v.clientId}` })
  if (!notified) await emailAgent(db, v.agentId, `${who} confirmed a time`, `${esc(said)}.`, `${SITE}/clients/${v.clientId}`, `Open ${who}`)
  return { ok: true }
}

async function emailAgent(db: Db, agentId: string, subject: string, line: string, href: string, label: string) {
  if (!db.auth) return
  const { data: u } = await db.auth.admin.getUserById(agentId)
  const to = u?.user?.email
  if (!to) return
  await sendEmail({
    to,
    subject,
    fromName: "Marvberry",
    html: teamNote(line, para(`<a href="${href}" style="color:#1F1E1C;border-bottom:1px solid #C2A46B;text-decoration:none;">${label}</a>`)),
    text: `${line.replace(/&rsquo;/g, "'")}\n\n${label}: ${href}`,
  })
}

// ---------------------------------------------------------------- expiry

// Hourly: times that have passed are released one by one. When no time is left,
// or 48 hours go by, every hold is released and the agent hears about it.
export async function closeExpired(db: Db): Promise<number> {
  const nowISO = new Date().toISOString()
  await db.from("meeting_options").update({ released_at: nowISO }).is("released_at", null).lt("starts_at", nowISO)
  const { data: waiting } = await db
    .from("meeting_invites")
    .select("id, agent_id, client_id, expires_at, clients(first_name)")
    .eq("status", "waiting")
    .limit(500)
  let closed = 0
  for (const inv of (waiting ?? []) as { id: string; agent_id: string; client_id: string; expires_at: string; clients: { first_name: string } | null }[]) {
    const { count } = await db.from("meeting_options").select("id", { count: "exact", head: true }).eq("invite_id", inv.id).is("released_at", null)
    const timedOut = Date.parse(inv.expires_at) < Date.now()
    if (!timedOut && (count ?? 0) > 0) continue
    const { data: claimed } = await db
      .from("meeting_invites")
      .update({ status: "expired", closed_at: nowISO })
      .eq("id", inv.id)
      .eq("status", "waiting")
      .select("id")
    if (!claimed?.length) continue
    await db.from("meeting_options").update({ released_at: nowISO }).eq("invite_id", inv.id).is("released_at", null)
    const who = inv.clients?.first_name || "Your client"
    const body = timedOut
      ? `${who} hasn't picked a time yet, so I've released the holds. Want me to follow up with ${who}?`
      : `The times you offered ${who} have passed, so I've released them. Want me to find new ones?`
    const notified = await notifyAgent(db, inv.agent_id, "bookings", {
      line: timedOut ? `${who} didn't pick a time, so the holds are released` : `the times you offered ${who} passed`,
      body,
      url: `/clients/${inv.client_id}`,
    })
    if (!notified) await emailAgent(db, inv.agent_id, `${who} hasn't picked a time`, esc(body).replace(/'/g, "&rsquo;"), `${SITE}/clients/${inv.client_id}`, `Open ${who}`)
    closed++
  }
  return closed
}
