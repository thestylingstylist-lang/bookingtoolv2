"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { stageLabel, toBuyPhase, toSellPhase } from "@/lib/phases"
import { journeysFor, suiteName } from "@/lib/suite"

// The agent's messages dock: every client conversation, one chat at a time.
// Runs as the logged-in agent under RLS.

export type InboxRow = {
  clientId: string
  name: string
  initials: string
  last: string
  mine: boolean
  at: string
  unread: boolean
}
export type DockMessage = { id: string; at: string; mine: boolean; body: string }
export type Thread = { clientId: string; name: string; initials: string; sub: string; messages: DockMessage[] }

function initials(first?: string | null, last?: string | null) {
  return ((first || "").charAt(0) + (last || "").charAt(0)).toUpperCase() || "?"
}
function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ") || "Client"
}

async function agent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, userId: user?.id ?? null }
}

export async function loadInbox(): Promise<{ rows: InboxRow[] } | null> {
  const { supabase, userId } = await agent()
  if (!userId) return null
  const { data: msgs } = await supabase
    .from("messages")
    .select("client_id, sender, body, created_at")
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(600)
  const latest = new Map<string, { sender: string; body: string; created_at: string; lastClientAt: string | null }>()
  for (const m of (msgs ?? []) as { client_id: string; sender: string; body: string; created_at: string }[]) {
    const cur = latest.get(m.client_id)
    if (!cur) latest.set(m.client_id, { sender: m.sender, body: m.body, created_at: m.created_at, lastClientAt: m.sender === "client" ? m.created_at : null })
    else if (!cur.lastClientAt && m.sender === "client") cur.lastClientAt = m.created_at
  }
  const ids = [...latest.keys()]
  if (ids.length === 0) return { rows: [] }
  const { data: people } = await supabase.from("clients").select("id, first_name, last_name").in("id", ids)
  // When each chat was last opened. Read apart: the column arrives with agent-messages.sql.
  const { data: reads, error: readErr } = await supabase.from("clients").select("id, agent_read_at").in("id", ids)
  const readAt = new Map(readErr ? [] : ((reads ?? []) as { id: string; agent_read_at: string | null }[]).map((r) => [r.id, r.agent_read_at]))
  const who = new Map(((people ?? []) as { id: string; first_name: string | null; last_name: string | null }[]).map((p) => [p.id, p]))
  const rows: InboxRow[] = []
  for (const [id, m] of latest) {
    const p = who.get(id)
    if (!p) continue
    const seen = readAt.get(id)
    rows.push({
      clientId: id,
      name: fullName(p.first_name, p.last_name),
      initials: initials(p.first_name, p.last_name),
      last: m.body,
      mine: m.sender !== "client",
      at: m.created_at,
      unread: !!m.lastClientAt && m.sender === "client" && (!seen || new Date(m.lastClientAt) > new Date(seen)),
    })
  }
  rows.sort((a, b) => b.at.localeCompare(a.at))
  return { rows }
}

export async function loadThread(clientId: string): Promise<Thread | null> {
  const { supabase, userId } = await agent()
  if (!userId || !/^[0-9a-f-]{36}$/i.test(clientId)) return null
  const { data: c } = await supabase.from("clients").select("id, first_name, last_name, client_type, phase").eq("id", clientId).maybeSingle()
  if (!c) return null
  const [{ data: msgs }, { data: sellRow }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender, body, created_at")
      .eq("client_id", clientId)
      .not("body", "is", null)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase.from("clients").select("sell_phase, private_showings").eq("id", clientId).maybeSingle(),
  ])
  // Opening the chat marks it read.
  await supabase.from("clients").update({ agent_read_at: new Date().toISOString() }).eq("id", clientId)

  const j = journeysFor(c.client_type)[0]
  const sell = (sellRow ?? {}) as { sell_phase?: string | null; private_showings?: boolean | null }
  const stage =
    j === "sell"
      ? stageLabel(toSellPhase(sell.sell_phase), !!sell.private_showings)
      : stageLabel(toBuyPhase(c.phase))
  const suite = suiteName(c.client_type)
  return {
    clientId,
    name: fullName(c.first_name, c.last_name),
    initials: initials(c.first_name, c.last_name),
    sub: `${suite.charAt(0).toUpperCase()}${suite.slice(1)} · ${stage}`,
    messages: ((msgs ?? []) as { id: string; sender: string; body: string; created_at: string }[]).map((m) => ({
      id: m.id,
      at: m.created_at,
      mine: m.sender !== "client",
      body: m.body,
    })),
  }
}

export async function clientFirstName(clientId: string): Promise<string | null> {
  const { supabase, userId } = await agent()
  if (!userId || !/^[0-9a-f-]{36}$/i.test(clientId)) return null
  const { data } = await supabase.from("clients").select("first_name, last_name").eq("id", clientId).maybeSingle()
  return data ? data.first_name || fullName(data.first_name, data.last_name) : null
}

export async function sendFromDock(clientId: string, body: string): Promise<{ ok: true; message: DockMessage } | { ok: false }> {
  const { supabase, userId } = await agent()
  const text = body.trim().slice(0, 4000)
  if (!userId || !text || !/^[0-9a-f-]{36}$/i.test(clientId)) return { ok: false }
  const { data, error } = await supabase
    .from("messages")
    .insert({ agent_id: userId, client_id: clientId, sender: "agent", body: text })
    .select("id, created_at")
    .single()
  if (error || !data) return { ok: false }
  revalidatePath(`/clients/${clientId}`)
  return { ok: true, message: { id: data.id, at: data.created_at, mine: true, body: text } }
}
