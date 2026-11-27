import { notifyAgent } from "./notify"

// What a client did on their own page. Each one tells the agent, moves the client
// to the top of her list, and waits in the jacket under "New from Kelly" until she opens it.
// Views never count.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any }

export type ActivityKind = "note" | "offer" | "times" | "upload" | "booking"

export type Activity = {
  id: string
  client_id: string
  home_id: string | null
  kind: ActivityKind
  line: string
  detail: string | null
  created_at: string
  seen_at: string | null
}

export const ACTIVITY_COLS = "id, client_id, home_id, kind, line, detail, created_at, seen_at"

// Saves it and sends the notification. Never throws: the client's own action
// has already gone through, and it must stay that way before client-activity.sql has run.
export async function recordActivity(
  db: Db,
  a: { agentId: string; clientId: string; homeId?: string | null; kind: ActivityKind; line: string; detail?: string; push?: string },
): Promise<void> {
  let fresh = true
  try {
    // A note she keeps editing is one piece of news, not five.
    if (a.kind === "note" && a.homeId) {
      const { data: open } = await db
        .from("client_activity")
        .select("id, created_at")
        .eq("client_id", a.clientId)
        .eq("home_id", a.homeId)
        .eq("kind", "note")
        .is("seen_at", null)
        .maybeSingle()
      if (open?.id) {
        await db.from("client_activity").update({ detail: a.detail ?? null, line: a.line }).eq("id", open.id)
        fresh = Date.now() - Date.parse(open.created_at) > 30 * 60 * 1000
        if (fresh) await db.from("client_activity").update({ created_at: new Date().toISOString() }).eq("id", open.id)
      } else {
        await db.from("client_activity").insert({ agent_id: a.agentId, client_id: a.clientId, home_id: a.homeId, kind: a.kind, line: a.line, detail: a.detail ?? null })
      }
    } else {
      await db.from("client_activity").insert({
        agent_id: a.agentId,
        client_id: a.clientId,
        home_id: a.homeId ?? null,
        kind: a.kind,
        line: a.line,
        detail: a.detail ?? null,
      })
    }
  } catch (e) {
    console.error("[activity]", e)
  }
  if (!fresh || !a.push) return
  try {
    await notifyAgent(db, a.agentId, a.kind === "booking" ? "bookings" : "messages", { line: a.line, body: a.push, url: `/clients/${a.clientId}` })
  } catch (e) {
    console.error("[activity] notify", e)
  }
}

// "15 East 96th Street" from "15 East 96th Street, New York, NY"
export const streetOf = (address: string) => (address || "").split(",")[0].trim()

export const quote = (s: string, max = 90) => {
  const t = s.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 2).trimEnd()}…` : t
}
