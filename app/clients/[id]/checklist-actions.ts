"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OFFER_DOCS, BUY_PHASES, SELL_PHASES, journeyOf, toPhase, phaseIndex, type Phase } from "@/lib/phases"
import { toDue } from "@/lib/due"

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

  const owner = formData.get("owner") === "client" ? "client" : "agent"
  const { error } = await supabase.from("steps").insert({
    agent_id: userId,
    client_id: clientId,
    title,
    phase,
    owner,
    due_on: toDue(formData.get("due")),
    position: count ?? 0,
  })
  back(clientId, error ? "task" : undefined)
}

export async function setDueDate(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase.from("steps").update({ due_on: toDue(formData.get("due")) }).eq("id", id)
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

// ---- Redo -------------------------------------------------------------------

// The client's suite reads the same rows; refresh it too.
async function refreshSuite(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string) {
  const { data } = await supabase.from("clients").select("portal_token").eq("id", clientId).maybeSingle()
  if (data?.portal_token) revalidatePath(`/portal/${data.portal_token}`)
}

// Signed agreements for this client go to Replaced: kept in the file, no longer the live one.
async function replaceAgreements(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, onlyId?: string) {
  let q = supabase.from("documents").update({ replaced_at: new Date().toISOString() }).eq("client_id", clientId).eq("status", "signed").is("replaced_at", null)
  q = onlyId ? q.eq("id", onlyId) : q.eq("kind", "agreement")
  const { error } = await q
  return error
}

// Open a finished step again. If it sits in an earlier stage, the client goes back to that stage.
async function reopen(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, stepId: string) {
  const { data: step } = await supabase.from("steps").select("id, title, phase").eq("id", stepId).eq("client_id", clientId).maybeSingle()
  if (!step) return "task"
  const now = new Date().toISOString()
  const { error } = await supabase.from("steps").update({ done: false, done_at: null, reopened_at: now }).eq("id", stepId)
  // Before step-redo.sql has run: still reopen it, it just can't be held open against old facts.
  if (error) {
    const { error: e2 } = await supabase.from("steps").update({ done: false, done_at: null }).eq("id", stepId)
    if (e2) return "task"
  }
  const stepPhase = toPhase(step.phase ?? "showing") as Phase
  const column = journeyOf(stepPhase) === "sell" ? "sell_phase" : "phase"
  const { data: c } = await supabase.from("clients").select(column).eq("id", clientId).maybeSingle()
  const cur = (c as Record<string, string | null> | null)?.[column]
  if (cur && phaseIndex(toPhase(cur) as Phase) > phaseIndex(stepPhase)) await supabase.from("clients").update({ [column]: stepPhase }).eq("id", clientId)
  return step.title === "Agreement signed" ? ((await replaceAgreements(supabase, clientId)) ? "redo" : null) : null
}

export async function reopenStep(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  if (!clientId) redirect("/clients")
  const err = await reopen(supabase, clientId, id)
  await refreshSuite(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=tasks${err ? `&error=${err}` : `&step=${id}`}`)
}

// Redo a signed document: the old copy stays, marked Replaced. Redoing the agreement reopens its step.
export async function redoDocument(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const docId = String(formData.get("documentId") ?? "")
  if (!clientId) redirect("/clients")
  const { data: doc } = await supabase.from("documents").select("id, kind, status").eq("id", docId).eq("client_id", clientId).maybeSingle()
  if (!doc || doc.status !== "signed") back(clientId, "redo")
  const err = await replaceAgreements(supabase, clientId, docId)
  if (err) back(clientId, "redo")
  if ((doc.kind ?? "agreement") === "agreement") {
    const { data: step } = await supabase.from("steps").select("id").eq("client_id", clientId).eq("title", "Agreement signed").maybeSingle()
    if (step?.id) await reopen(supabase, clientId, step.id as string)
  }
  await refreshSuite(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=tasks&redo=${docId}`)
}

export async function renameStep(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "").trim().slice(0, 160)
  if (!clientId) redirect("/clients")
  if (!title) back(clientId)
  const { error } = await supabase.from("steps").update({ title }).eq("id", id).eq("client_id", clientId)
  await refreshSuite(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=tasks${error ? "&error=task" : ""}`)
}

// Up or down one place within its stage.
export async function moveStep(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const id = String(formData.get("id") ?? "")
  const dir = formData.get("dir") === "up" ? -1 : 1
  if (!clientId) redirect("/clients")
  const { data: me } = await supabase.from("steps").select("phase").eq("id", id).eq("client_id", clientId).maybeSingle()
  if (me) {
    let q = supabase.from("steps").select("id").eq("client_id", clientId).order("position", { ascending: true }).order("created_at", { ascending: true })
    q = me.phase ? q.eq("phase", me.phase) : q.is("phase", null)
    const { data: rows } = await q
    const ids = ((rows ?? []) as { id: string }[]).map((r) => r.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i >= 0 && j >= 0 && j < ids.length) {
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      await Promise.all(ids.map((sid, position) => supabase.from("steps").update({ position }).eq("id", sid)))
    }
  }
  await refreshSuite(supabase, clientId)
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=tasks`)
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

  const steps = [...BUY_PHASES, ...SELL_PHASES].find((p) => p.key === phase)?.steps ?? []
  if (steps.length === 0) return null
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

  // Buying and selling stages are kept in separate columns.
  const column = journeyOf(to) === "sell" ? "sell_phase" : "phase"
  const { error } = await supabase.from("clients").update({ [column]: to }).eq("id", clientId)
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

  // Asked for at a particular step: it shows under that step in the client's suite.
  const stepId = String(formData.get("stepId") ?? "")
  let { error } = await supabase
    .from("collected_docs")
    .insert({ agent_id: userId, client_id: clientId, title, ...(stepId ? { step_id: stepId } : {}) })
  if (error && stepId) ({ error } = await supabase.from("collected_docs").insert({ agent_id: userId, client_id: clientId, title }))
  await refreshSuite(supabase, clientId)
  if (stepId) {
    revalidatePath(`/clients/${clientId}`)
    redirect(`/clients/${clientId}?tab=tasks${error ? "&error=collected" : ""}`)
  }
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
