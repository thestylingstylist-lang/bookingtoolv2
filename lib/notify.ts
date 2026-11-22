import webpush from "web-push"
import { formatInTimeZone } from "date-fns-tz"

// Browser notifications for agents. Clients never get these; they keep email.
// The private key lives in Vercel as VAPID_PRIVATE_KEY.
import { VAPID_PUBLIC_KEY } from "./notify-key"

export type NotifyKind = "messages" | "signed" | "bookings" | "support"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

type AgentPrefs = {
  notify_messages: boolean
  notify_signed: boolean
  notify_bookings: boolean
  notify_support: boolean
  notify_hours_only: boolean
  timezone: string | null
  weekdays: number[] | null
  day_start: number | null
  day_end: number | null
}

const PREFS =
  "notify_messages, notify_signed, notify_bookings, notify_support, notify_hours_only, timezone, weekdays, day_start, day_end"

function ready(): boolean {
  const key = process.env.VAPID_PRIVATE_KEY
  if (!key) return false
  webpush.setVapidDetails("mailto:team@marvberry.com", VAPID_PUBLIC_KEY, key)
  return true
}

// Inside her booking hours, in her own time zone.
export function withinHours(a: Pick<AgentPrefs, "timezone" | "weekdays" | "day_start" | "day_end">, at = new Date()) {
  const tz = a.timezone || "America/New_York"
  const weekday = Number(formatInTimeZone(at, tz, "i"))
  const hour = Number(formatInTimeZone(at, tz, "H")) + Number(formatInTimeZone(at, tz, "m")) / 60
  const days = a.weekdays?.length ? a.weekdays : [1, 2, 3, 4, 5]
  const start = a.day_start ?? 9
  const end = a.day_end ?? 17
  return days.includes(weekday) && hour >= start && hour < end
}

export type Push = { title: string; body: string; url: string; tag?: string }

// Sends to every browser she turned on. Gone subscriptions are removed.
export async function pushTo(db: Db, agentId: string, p: Push): Promise<boolean> {
  if (!ready()) return false
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("agent_id", agentId)
  if (error || !subs?.length) return false
  let delivered = false
  await Promise.all(
    (subs as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(p),
          { TTL: 60 * 60 * 24 },
        )
        delivered = true
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id)
      }
    }),
  )
  return delivered
}

// One event for one agent. `line` is the short form used in the morning note
// ("Sophia wrote to you"); `body` is the full notification.
// Returns true when the agent will hear about it by notification, so the
// caller can skip the email.
export async function notifyAgent(
  db: Db,
  agentId: string,
  kind: NotifyKind,
  n: { line: string; body: string; url: string },
): Promise<boolean> {
  try {
    const { data, error } = await db.from("agents").select(PREFS).eq("id", agentId).maybeSingle()
    if (error || !data) return false
    const a = data as AgentPrefs
    const on = { messages: a.notify_messages, signed: a.notify_signed, bookings: a.notify_bookings, support: a.notify_support }[kind]
    if (!on) return false
    const { count } = await db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("agent_id", agentId)
    if (!count || !process.env.VAPID_PRIVATE_KEY) return false
    if (a.notify_hours_only && !withinHours(a)) {
      const { error: qErr } = await db.from("notification_queue").insert({ agent_id: agentId, line: n.line, url: n.url })
      return !qErr
    }
    return await pushTo(db, agentId, { title: "Marvberry", body: n.body, url: n.url, tag: kind })
  } catch (e) {
    console.error("[notify]", e)
    return false
  }
}

// "a", "a and b", "a, b and c"
function joinLines(lines: string[]) {
  if (lines.length <= 1) return lines.join("")
  return `${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`
}

// The morning note: everything held overnight, as one notification from Diana,
// sent once her day has started.
export async function releaseHeld(db: Db): Promise<number> {
  const { data: rows, error } = await db
    .from("notification_queue")
    .select("id, agent_id, line, url, created_at")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(2000)
  if (error || !rows?.length) return 0
  const byAgent = new Map<string, { id: string; line: string; url: string | null }[]>()
  for (const r of rows as { id: string; agent_id: string; line: string; url: string | null }[]) {
    byAgent.set(r.agent_id, [...(byAgent.get(r.agent_id) ?? []), r])
  }
  let sent = 0
  for (const [agentId, items] of byAgent) {
    const { data: a } = await db.from("agents").select(PREFS).eq("id", agentId).maybeSingle()
    if (!a) continue
    const prefs = a as AgentPrefs
    if (!withinHours(prefs)) continue
    const tz = prefs.timezone || "America/New_York"
    const hello = Number(formatInTimeZone(new Date(), tz, "H")) < 12 ? "Good morning." : "Good afternoon."
    const lines = items.slice(0, 6).map((i) => i.line)
    const more = items.length - lines.length
    const body = `${hello} While you were away, ${joinLines(more > 0 ? [...lines, `${more} more`] : lines)}.`
    const url = items.length === 1 && items[0].url ? items[0].url : "/dashboard"
    await pushTo(db, agentId, { title: "Marvberry", body, url, tag: "morning" })
    await db.from("notification_queue").update({ sent_at: new Date().toISOString() }).in("id", items.map((i) => i.id))
    sent++
  }
  return sent
}
