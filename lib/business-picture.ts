// Shared by the dashboard boxes and the client list they open, so both always agree.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

// Deal stages in one plain set of words, buying and selling together.
export const STAGES = ["preparing", "showing", "listed", "offer", "contract", "closing"] as const
export type Stage = (typeof STAGES)[number]
export const STAGE_LABEL: Record<Stage, string> = {
  preparing: "Preparing",
  showing: "Showing",
  listed: "Listed",
  offer: "Offer",
  contract: "Contract",
  closing: "Closing",
}

const SELL_TO_STAGE: Record<string, Stage> = {
  s_preparing: "preparing",
  listing: "listed",
  open_house: "listed",
  offers: "offer",
  s_contract: "contract",
  s_closing: "closing",
}

export type DealRow = { id: string; phase: string | null; sell_phase: string | null; client_type: string | null; status: string | null; archived: boolean | null }

export function stageOf(c: DealRow): Stage {
  if (c.client_type === "seller") return SELL_TO_STAGE[c.sell_phase || ""] ?? "preparing"
  return (STAGES as readonly string[]).includes(c.phase || "") ? (c.phase as Stage) : "preparing"
}

// Active deals and the stage each is in. Archived and closed-out clients don't count.
export async function loadDeals(db: Db): Promise<Map<string, Stage>> {
  const { data, error } = await db.from("clients").select("id, phase, sell_phase, client_type, status, archived")
  const out = new Map<string, Stage>()
  if (error) return out
  for (const c of (data ?? []) as DealRow[]) {
    if (c.archived || (c.status && c.status !== "active")) continue
    out.set(c.id, stageOf(c))
  }
  return out
}

// "2 showing, 1 offer, 1 closing"
export function stageLine(deals: Map<string, Stage>) {
  const n = new Map<Stage, number>()
  for (const s of deals.values()) n.set(s, (n.get(s) ?? 0) + 1)
  return STAGES.filter((s) => n.get(s)).map((s) => `${n.get(s)} ${s}`).join(", ")
}

// Follow-ups due: clients she kept for follow-up, and clients waiting on her
// (a step of hers due today or late, or a message from them she hasn't answered).
export type FollowUp = { kept: boolean; waiting: string }

export async function loadFollowUps(db: Db, tz: string): Promise<Map<string, FollowUp>> {
  const out = new Map<string, FollowUp>()
  const get = (id: string) => out.get(id) ?? { kept: false, waiting: "" }

  const { data: kept, error: keptErr } = await db.from("clients").select("id").not("follow_up_at", "is", null)
  if (!keptErr) for (const r of (kept ?? []) as { id: string }[]) out.set(r.id, { ...get(r.id), kept: true })

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  const { data: steps } = await db
    .from("steps")
    .select("client_id, title, owner, due_on")
    .eq("done", false)
    .eq("owner", "agent")
    .not("due_on", "is", null)
    .lte("due_on", today)
    .order("due_on", { ascending: true })
  for (const s of (steps ?? []) as { client_id: string; title: string; due_on: string }[]) {
    if (!s.client_id || get(s.client_id).waiting) continue
    out.set(s.client_id, { ...get(s.client_id), waiting: `${s.title}, ${s.due_on < today ? "past due" : "due today"}` })
  }

  const { data: msgs } = await db
    .from("messages")
    .select("client_id, sender, created_at")
    .not("body", "is", null)
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(400)
  const last = new Map<string, string>()
  for (const m of (msgs ?? []) as { client_id: string; sender: string }[]) if (m.client_id && !last.has(m.client_id)) last.set(m.client_id, m.sender)
  for (const [id, sender] of last) if (sender === "client" && !get(id).waiting) out.set(id, { ...get(id), waiting: "Waiting on your reply" })

  return out
}

export const followUpLine = (f: FollowUp) => [f.kept ? "Kept for follow-up" : "", f.waiting].filter(Boolean).join(" · ")
