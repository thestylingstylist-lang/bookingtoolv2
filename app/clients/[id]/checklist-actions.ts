"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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
  if (!clientId) redirect("/clients")
  if (!title) back(clientId)

  const { count } = await supabase
    .from("steps")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)

  const { error } = await supabase.from("steps").insert({
    agent_id: userId,
    client_id: clientId,
    title,
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
