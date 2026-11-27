import type { SupabaseClient } from "@supabase/supabase-js"

// Steps that finish themselves when the thing they describe happens, so nobody has to
// tick them by hand: the agreement is signed, homes are on the list, the client has
// shared their times, the documents for a step are in.

export async function tickStep(db: SupabaseClient, clientId: string, title: string): Promise<void> {
  try {
    // It happened (again): done, and no longer held open by a redo.
    const { error } = await db
      .from("steps")
      .update({ done: true, done_at: new Date().toISOString(), reopened_at: null })
      .eq("client_id", clientId)
      .eq("title", title)
      .eq("done", false)
    if (error) await db.from("steps").update({ done: true }).eq("client_id", clientId).eq("title", title).eq("done", false)
  } catch (err) {
    console.error("[auto-steps] tick failed:", err)
  }
}

// Read apart, so nothing breaks before step-redo.sql has run: each comes back empty instead.
// Signed documents that have been redone.
export async function loadReplaced(db: SupabaseClient, clientId: string): Promise<Set<string>> {
  try {
    const { data, error } = await db.from("documents").select("id").eq("client_id", clientId).not("replaced_at", "is", null)
    return new Set(error ? [] : ((data ?? []) as { id: string }[]).map((d) => d.id))
  } catch {
    return new Set()
  }
}
// Requested documents tied to a step: document id → step id.
export async function loadDocSteps(db: SupabaseClient, clientId: string): Promise<Map<string, string>> {
  try {
    const { data, error } = await db.from("collected_docs").select("id, step_id").eq("client_id", clientId).not("step_id", "is", null)
    return new Map(error ? [] : ((data ?? []) as { id: string; step_id: string }[]).map((d) => [d.id, d.step_id]))
  } catch {
    return new Map()
  }
}
async function loadReopened(db: SupabaseClient, clientId: string): Promise<Set<string>> {
  try {
    const { data, error } = await db.from("steps").select("title").eq("client_id", clientId).eq("done", false).not("reopened_at", "is", null)
    return new Set(error ? [] : ((data ?? []) as { title: string }[]).map((d) => d.title))
  } catch {
    return new Set()
  }
}

// The step a requested document sits under: the one the agent chose, or the usual one.
export function docStepTitle(doc: { id: string; title: string }, docSteps: Map<string, string>, stepTitleById: Map<string, string>): string {
  const sid = docSteps.get(doc.id)
  return (sid && stepTitleById.get(sid)) || stepForDoc(doc.title)
}

// Which step a requested document belongs to.
export function stepForDoc(docTitle: string): string {
  return /pre-?approval|proof of funds|funds/i.test(docTitle) ? "Pre-approval or proof of funds" : "Collect the client's documents"
}

export type StepFacts = {
  agreementSigned: boolean
  hasHomes: boolean
  sharedTimes: boolean
  // Requested documents by step title: are they all in?
  docsDone: Map<string, boolean>
  // Steps the agent reopened: what happened before doesn't finish them again.
  reopened: Set<string>
}

// True when a step is done by the facts, even if nobody ticked it yet.
export function doneByFacts(title: string, f: StepFacts): boolean {
  if (f.reopened?.has(title)) return false
  if (title === "Agreement signed") return f.agreementSigned
  if (title === "Send curated homes") return f.hasHomes
  if (title === "Get their availability") return f.sharedTimes
  const docs = f.docsDone.get(title)
  return docs === true
}

// The facts for one client, read from the same tables both sides use: the client's suite,
// the agent's client page and Diana all call this, so a step reads the same everywhere.
export async function loadStepFacts(db: SupabaseClient, clientId: string): Promise<StepFacts> {
  const [{ data: docs }, { count }, { data: times }, { data: requested }, { data: stepRows }, replaced, docSteps, reopened] = await Promise.all([
    db.from("documents").select("id, status, kind").eq("client_id", clientId),
    db.from("homes").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    db.from("clients").select("showing_times_at").eq("id", clientId).maybeSingle(),
    db.from("collected_docs").select("id, title, received").eq("client_id", clientId),
    db.from("steps").select("id, title").eq("client_id", clientId),
    loadReplaced(db, clientId),
    loadDocSteps(db, clientId),
    loadReopened(db, clientId),
  ])
  const stepTitleById = new Map(((stepRows ?? []) as { id: string; title: string }[]).map((r) => [r.id, r.title]))
  const byStep = new Map<string, boolean[]>()
  for (const d of (requested ?? []) as { id: string; title: string; received: boolean }[]) {
    const k = docStepTitle(d, docSteps, stepTitleById)
    byStep.set(k, [...(byStep.get(k) ?? []), d.received])
  }
  return {
    // A replaced agreement no longer counts as signed.
    agreementSigned: ((docs ?? []) as { id: string; status: string; kind: string | null }[]).some(
      (d) => d.status === "signed" && (d.kind ?? "agreement") === "agreement" && !replaced.has(d.id),
    ),
    hasHomes: (count ?? 0) > 0,
    // Before suite-homes.sql runs this column is missing; the read simply comes back empty.
    sharedTimes: !!(times as { showing_times_at?: string | null } | null)?.showing_times_at,
    docsDone: new Map([...byStep].map(([k, v]) => [k, v.length > 0 && v.every(Boolean)])),
    reopened,
  }
}

// Steps with what has happened applied, in the same order.
export function withFacts<T extends { title: string; done: boolean }>(steps: T[], facts: StepFacts): T[] {
  return steps.map((s) => (s.done || !doneByFacts(s.title, facts) ? s : { ...s, done: true }))
}
