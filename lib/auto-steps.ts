import type { SupabaseClient } from "@supabase/supabase-js"

// Steps that finish themselves when the thing they describe happens, so nobody has to
// tick them by hand: the agreement is signed, homes are on the list, the client has
// shared their times, the documents for a step are in.

export async function tickStep(db: SupabaseClient, clientId: string, title: string): Promise<void> {
  try {
    await db.from("steps").update({ done: true }).eq("client_id", clientId).eq("title", title).eq("done", false)
  } catch (err) {
    console.error("[auto-steps] tick failed:", err)
  }
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
}

// True when a step is done by the facts, even if nobody ticked it yet.
export function doneByFacts(title: string, f: StepFacts): boolean {
  if (title === "Agreement signed") return f.agreementSigned
  if (title === "Send curated homes") return f.hasHomes
  if (title === "Get their availability") return f.sharedTimes
  const docs = f.docsDone.get(title)
  return docs === true
}

// The facts for one client, read from the same tables both sides use: the client's suite,
// the agent's client page and Diana all call this, so a step reads the same everywhere.
export async function loadStepFacts(db: SupabaseClient, clientId: string): Promise<StepFacts> {
  const [{ data: docs }, { count }, { data: times }, { data: requested }] = await Promise.all([
    db.from("documents").select("status, kind").eq("client_id", clientId),
    db.from("homes").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    db.from("clients").select("showing_times_at").eq("id", clientId).maybeSingle(),
    db.from("collected_docs").select("title, received").eq("client_id", clientId),
  ])
  const byStep = new Map<string, boolean[]>()
  for (const d of (requested ?? []) as { title: string; received: boolean }[]) byStep.set(stepForDoc(d.title), [...(byStep.get(stepForDoc(d.title)) ?? []), d.received])
  return {
    agreementSigned: ((docs ?? []) as { status: string; kind: string | null }[]).some((d) => d.status === "signed" && (d.kind ?? "agreement") === "agreement"),
    hasHomes: (count ?? 0) > 0,
    // Before suite-homes.sql runs this column is missing; the read simply comes back empty.
    sharedTimes: !!(times as { showing_times_at?: string | null } | null)?.showing_times_at,
    docsDone: new Map([...byStep].map(([k, v]) => [k, v.length > 0 && v.every(Boolean)])),
  }
}

// Steps with what has happened applied, in the same order.
export function withFacts<T extends { title: string; done: boolean }>(steps: T[], facts: StepFacts): T[] {
  return steps.map((s) => (s.done || !doneByFacts(s.title, facts) ? s : { ...s, done: true }))
}
