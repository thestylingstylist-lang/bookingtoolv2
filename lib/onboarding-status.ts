import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

// Team-side onboarding: where each realtor stands, from signed up to actively
// using Marvberry. The team does the setup; the realtor's job is using it.

export const NUDGE_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

export type OnboardingRow = {
  agent_id: string
  created_at: string
  owner: string
  setup_call_done: boolean
  setup_call_at: string | null
  completed_at: string | null
}

export type OnboardingDoc = {
  id: string
  agent_id: string
  created_at: string
  title: string
  file_path: string | null
  file_name: string | null
  uploaded_at: string | null
  template_built: boolean
}

export type StatusKey = "new" | "onboarding" | "nudge" | "active" | "complete"

export const STATUS_LABEL: Record<StatusKey, string> = {
  new: "Just signed up",
  onboarding: "Onboarding",
  nudge: "Needs a nudge",
  active: "Active",
  complete: "Complete",
}

export type Step = { key: string; title: string; detail: string; done: boolean; team: boolean }

export type Activity = {
  clients: number
  sentAgreements: number
  lastActivity: string | null // newest client, document or message the realtor created
}

export function buildSteps(row: OnboardingRow, docs: OnboardingDoc[], act: Activity): Step[] {
  const asked = docs.length > 0
  return [
    { key: "signup", title: "Signed up", detail: "Account created", done: true, team: false },
    { key: "call", title: "Setup call done", detail: "Booking page, hours and brand set by the team", done: row.setup_call_done, team: true },
    { key: "docs", title: "Documents in", detail: asked ? `${docs.filter((d) => d.file_path).length} of ${docs.length} received` : "Request their documents", done: asked && docs.every((d) => d.file_path), team: false },
    { key: "templates", title: "Templates built", detail: "Their documents turned into ready templates", done: asked && docs.every((d) => d.template_built), team: true },
    { key: "client", title: "First client added", detail: "From a booking or by hand", done: act.clients > 0, team: false },
    { key: "agreement", title: "First agreement sent", detail: "Their client signs from their phone", done: act.sentAgreements > 0, team: false },
  ]
}

export function isActive(act: Activity, now = Date.now()): boolean {
  if (act.clients === 0 || act.sentAgreements === 0 || !act.lastActivity) return false
  return now - new Date(act.lastActivity).getTime() < NUDGE_DAYS * DAY
}

export function statusOf(row: OnboardingRow, act: Activity, now = Date.now()): StatusKey {
  if (row.completed_at) return "complete"
  if (isActive(act, now)) return "active"
  if (!row.setup_call_done) return "new"
  // Quiet for a week since the setup call (or their last move): time to check in.
  const since = Math.max(
    new Date(row.setup_call_at || row.created_at).getTime(),
    act.lastActivity ? new Date(act.lastActivity).getTime() : 0,
  )
  return now - since >= NUDGE_DAYS * DAY ? "nudge" : "onboarding"
}

export function nextStepLine(name: string, steps: Step[], status: StatusKey): string {
  if (status === "complete") return `${name} is fully onboarded. Their chat is now regular support.`
  const s = steps.find((x) => !x.done)
  if (!s) return `Everything's done. Mark ${name}'s onboarding complete.`
  if (status === "nudge") return `Check in with ${name} personally and ask what's getting in the way.`
  switch (s.key) {
    case "call": return `Run ${name}'s setup call.`
    case "docs": return s.detail === "Request their documents" ? `Request ${name}'s documents.` : `Waiting on ${name}'s documents.`
    case "templates": return `Build ${name}'s templates from what they sent.`
    case "client": return `Help ${name} add their first client.`
    case "agreement": return `Help ${name} send their first agreement.`
    default: return ""
  }
}

// Activity for a set of realtors, in a few queries.
export async function activityFor(admin: SupabaseClient, agentIds: string[]): Promise<Map<string, Activity>> {
  const out = new Map<string, Activity>()
  for (const id of agentIds) out.set(id, { clients: 0, sentAgreements: 0, lastActivity: null })
  if (!agentIds.length) return out
  const bump = (id: string, iso: string | null) => {
    const a = out.get(id)
    if (!a || !iso) return
    if (!a.lastActivity || iso > a.lastActivity) a.lastActivity = iso
  }
  const [{ data: clients }, { data: docs }, { data: msgs }] = await Promise.all([
    admin.from("clients").select("agent_id, created_at").in("agent_id", agentIds),
    admin.from("documents").select("agent_id, created_at, status").in("agent_id", agentIds),
    admin.from("messages").select("agent_id, created_at").in("agent_id", agentIds).eq("sender", "agent").order("created_at", { ascending: false }).limit(1000),
  ])
  for (const c of clients ?? []) {
    const a = out.get(c.agent_id as string)
    if (a) a.clients++
    bump(c.agent_id as string, c.created_at as string)
  }
  for (const d of docs ?? []) {
    const a = out.get(d.agent_id as string)
    if (a && (d.status === "sent" || d.status === "signed")) a.sentAgreements++
    bump(d.agent_id as string, d.created_at as string)
  }
  for (const m of msgs ?? []) bump(m.agent_id as string, m.created_at as string)
  return out
}
