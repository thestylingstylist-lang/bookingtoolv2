"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OFFER_DOCS, PHASES, toPhase } from "@/lib/phases"

// Tasks (steps table) and documents collected (collected_docs table)
// for one client. All run as the logged-in agent under RLS.

async function agentOrLogin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

function back(clientId: string, error?: string): never {
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}${error ? `?error=${error}` : ""}`)
}

// ---- Tasks ----------------------------------------------------------------

export async function addTask(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const phase = toPhase(formData.get("phase"))
  if (!clientId) redirect("/clients")
  if (!title) back(clientId)

  const { count } = await supabase
    .from("steps")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("phase", phase)

  const { error } = await supabase.from("steps").insert({
    agent_id: userId,
    client_id: clientId,
    title,
    phase,
    position: count ?? 0,
  })
  back(clientId, error ? "task" : undefined)
}

export async function toggleTask(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const done = formData.get("done") === "1"
  const { error } = await supabase
    .from("steps")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
  back(clientId, error ? "task" : undefined)
}

export async function deleteTask(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase.from("steps").delete().eq("id", id)
  back(clientId, error ? "task" : undefined)
}

// ---- Phases ---------------------------------------------------------------

// Adds a phase's standard steps, only if that phase has no steps yet.
async function seedPhase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clientId: string,
  phase: ReturnType<typeof toPhase>
) {
  const { count } = await supabase
    .from("steps")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("phase", phase)
  if ((count ?? 0) > 0) return null

  if (phase === "offer") {
    const docError = await seedOfferDocs(supabase, userId, clientId)
    if (docError) return docError
  }

  const steps = PHASES.find((p) => p.key === phase)?.steps ?? []
  const { error } = await supabase.from("steps").insert(
    steps.map((s, position) => ({
      agent_id: userId,
      client_id: clientId,
      title: s.title,
      owner: s.owner,
      phase,
      position,
    }))
  )
  return error
}

// Adds the standard offer-packet documents, skipping any already listed.
async function seedOfferDocs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clientId: string
) {
  const { data: existing } = await supabase
    .from("collected_docs")
    .select("title")
    .eq("client_id", clientId)
  const have = new Set((existing ?? []).map((d) => d.title.trim().toLowerCase()))
  const missing = OFFER_DOCS.filter((t) => !have.has(t.toLowerCase()))
  if (missing.length === 0) return null
  const { error } = await supabase
    .from("collected_docs")
    .insert(missing.map((title) => ({ agent_id: userId, client_id: clientId, title })))
  return error
}

// Move a client to another phase, forward or back. Only ever on a click.
export async function movePhase(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const to = toPhase(formData.get("to"))
  if (!clientId) redirect("/clients")

  const { error } = await supabase.from("clients").update({ phase: to }).eq("id", clientId)
  if (error) back(clientId, "phase")

  const seedError = await seedPhase(supabase, userId, clientId, to)
  back(clientId, seedError ? "task" : undefined)
}

export async function addStandardSteps(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const phase = toPhase(formData.get("phase"))
  if (!clientId) redirect("/clients")
  const error = await seedPhase(supabase, userId, clientId, phase)
  back(clientId, error ? "task" : undefined)
}

// ---- Documents collected --------------------------------------------------

export async function addCollected(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  if (!clientId) redirect("/clients")
  if (!title) back(clientId)

  const { error } = await supabase
    .from("collected_docs")
    .insert({ agent_id: userId, client_id: clientId, title })
  back(clientId, error ? "collected" : undefined)
}

export async function toggleCollected(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const received = formData.get("received") === "1"
  const { error } = await supabase
    .from("collected_docs")
    .update({ received, received_at: received ? new Date().toISOString() : null })
    .eq("id", id)
  back(clientId, error ? "collected" : undefined)
}

export async function deleteCollected(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase.from("collected_docs").delete().eq("id", id)
  back(clientId, error ? "collected" : undefined)
}
