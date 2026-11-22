import "server-only"
import { addDays } from "date-fns"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

// Diana's conversations (kept for 90 days in History, or cleared) and her
// memory: short notes about the agent and the agent's own clients.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

export type SavedLine = { me: boolean; text: string }
export type Memory = { id: string; body: string; client_id: string | null; client_name?: string }

const KEEP_DAYS = 90

async function agentPrefs(db: Db, agentId: string) {
  const { data } = await db.from("agents").select("timezone, day_end, weekdays").eq("id", agentId).maybeSingle()
  const { data: k } = await db.from("agents").select("assistant_keep").eq("id", agentId).maybeSingle()
  return {
    tz: (data?.timezone as string) || "America/New_York",
    dayEnd: (data?.day_end as number) ?? 17,
    keep: (k?.assistant_keep as boolean | undefined) ?? true,
  }
}

// The first end of a working day after the conversation's last message.
function dayOverAt(lastISO: string, tz: string, dayEnd: number) {
  const last = new Date(lastISO)
  const hh = String(Math.floor(dayEnd)).padStart(2, "0")
  const mm = String(Math.round((dayEnd % 1) * 60)).padStart(2, "0")
  let date = formatInTimeZone(last, tz, "yyyy-MM-dd")
  let at = fromZonedTime(`${date}T${hh}:${mm}:00`, tz)
  if (at <= last) {
    date = formatInTimeZone(addDays(fromZonedTime(`${date}T12:00:00`, tz), 1), tz, "yyyy-MM-dd")
    at = fromZonedTime(`${date}T${hh}:${mm}:00`, tz)
  }
  return at
}

async function finish(db: Db, id: string, keep: boolean) {
  if (keep) await db.from("assistant_conversations").update({ status: "kept", ended_at: new Date().toISOString() }).eq("id", id).eq("status", "open")
  else await db.from("assistant_conversations").delete().eq("id", id)
}

// The conversation in progress, after closing one whose working day has ended.
export async function openConversation(db: Db, agentId: string): Promise<{ id: string; lines: SavedLine[] } | null> {
  const { data, error } = await db
    .from("assistant_conversations")
    .select("id, lines, last_at")
    .eq("agent_id", agentId)
    .eq("status", "open")
    .order("last_at", { ascending: false })
    .limit(3)
  if (error || !data?.length) return null
  const p = await agentPrefs(db, agentId)
  let current: { id: string; lines: SavedLine[] } | null = null
  for (const c of data as { id: string; lines: SavedLine[]; last_at: string }[]) {
    if (current || Date.now() >= dayOverAt(c.last_at, p.tz, p.dayEnd).getTime()) await finish(db, c.id, p.keep)
    else current = { id: c.id, lines: Array.isArray(c.lines) ? c.lines : [] }
  }
  return current
}

export async function saveConversation(db: Db, agentId: string, lines: SavedLine[]) {
  const clean = lines.filter((l) => l.text?.trim()).slice(-80).map((l) => ({ me: !!l.me, text: String(l.text).slice(0, 6000) }))
  if (!clean.length) return
  const title = (clean.find((l) => l.me)?.text ?? "Conversation").replace(/\s+/g, " ").slice(0, 70)
  const cur = await openConversation(db, agentId)
  if (cur) await db.from("assistant_conversations").update({ lines: clean, last_at: new Date().toISOString() }).eq("id", cur.id)
  else await db.from("assistant_conversations").insert({ agent_id: agentId, lines: clean, title })
}

export async function endConversation(db: Db, agentId: string, keep: boolean) {
  const cur = await openConversation(db, agentId)
  if (cur) await finish(db, cur.id, keep)
}

export async function history(db: Db, agentId: string) {
  const since = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString()
  const { data } = await db
    .from("assistant_conversations")
    .select("id, title, last_at")
    .eq("agent_id", agentId)
    .eq("status", "kept")
    .gte("last_at", since)
    .order("last_at", { ascending: false })
    .limit(100)
  return (data ?? []) as { id: string; title: string; last_at: string }[]
}

export async function keptConversation(db: Db, agentId: string, id: string) {
  const { data } = await db.from("assistant_conversations").select("id, title, last_at, lines").eq("agent_id", agentId).eq("id", id).eq("status", "kept").maybeSingle()
  return data as { id: string; title: string; last_at: string; lines: SavedLine[] } | null
}

// ---------------------------------------------------------------- memory

export async function memories(db: Db, agentId: string): Promise<Memory[]> {
  const { data, error } = await db.from("assistant_memories").select("id, body, client_id, clients(first_name, last_name)").eq("agent_id", agentId).order("created_at").limit(200)
  if (error) return []
  return ((data ?? []) as { id: string; body: string; client_id: string | null; clients: { first_name: string | null; last_name: string | null } | null }[]).map((m) => ({
    id: m.id,
    body: m.body,
    client_id: m.client_id,
    client_name: m.clients ? `${m.clients.first_name ?? ""} ${m.clients.last_name ?? ""}`.trim() : undefined,
  }))
}

export async function remember(db: Db, agentId: string, body: string, clientId: string | null) {
  const note = body.replace(/\s+/g, " ").trim().slice(0, 300)
  if (!note) return { ok: false as const }
  // The same note twice isn't worth keeping.
  const { data: existing } = await db.from("assistant_memories").select("id, body").eq("agent_id", agentId)
  const k = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  if ((existing ?? []).some((m: { body: string }) => k(m.body) === k(note))) return { ok: true as const, dup: true }
  const { error } = await db.from("assistant_memories").insert({ agent_id: agentId, client_id: clientId, body: note })
  return { ok: !error }
}

export async function forget(db: Db, agentId: string, id: string) {
  const { error } = await db.from("assistant_memories").delete().eq("agent_id", agentId).eq("id", id)
  return !error
}

export async function forgetAll(db: Db, agentId: string) {
  const { error } = await db.from("assistant_memories").delete().eq("agent_id", agentId)
  return !error
}

// Hourly: close conversations whose working day has ended, and let History go after 90 days.
export async function tidyConversations(db: Db) {
  const { data } = await db.from("assistant_conversations").select("id, agent_id, last_at").eq("status", "open").limit(1000)
  const prefs = new Map<string, Awaited<ReturnType<typeof agentPrefs>>>()
  for (const c of (data ?? []) as { id: string; agent_id: string; last_at: string }[]) {
    if (!prefs.has(c.agent_id)) prefs.set(c.agent_id, await agentPrefs(db, c.agent_id))
    const p = prefs.get(c.agent_id)!
    if (Date.now() >= dayOverAt(c.last_at, p.tz, p.dayEnd).getTime()) await finish(db, c.id, p.keep)
  }
  await db.from("assistant_conversations").delete().eq("status", "kept").lt("last_at", new Date(Date.now() - KEEP_DAYS * 86400000).toISOString())
}
