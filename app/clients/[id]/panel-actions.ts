"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Client panel: buying range + type, offers, dated notes.

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

// "$350,000" -> 350000 ; blank -> null
function money(v: FormDataEntryValue | null): number | null {
  const digits = String(v ?? "").replace(/[^0-9]/g, "")
  return digits ? Math.min(Number(digits), 2_000_000_000) : null
}

export async function saveDeal(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const t = String(formData.get("clientType") ?? "")
  const clientType = ["buyer", "seller", "both"].includes(t) ? t : null
  const { error } = await supabase
    .from("clients")
    .update({
      client_type: clientType,
      budget_min: money(formData.get("budgetMin")),
      budget_max: money(formData.get("budgetMax")),
    })
    .eq("id", clientId)
  back(clientId, error ? "deal" : undefined)
}

export async function addOffer(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const address = String(formData.get("address") ?? "").trim()
  if (!clientId) redirect("/clients")
  if (!address) back(clientId, "offer")
  const { error } = await supabase.from("offers").insert({
    agent_id: userId,
    client_id: clientId,
    property_address: address,
    amount: money(formData.get("amount")),
    other_agent_name: String(formData.get("agentName") ?? "").trim() || null,
    other_agent_email: String(formData.get("agentEmail") ?? "").trim() || null,
  })
  back(clientId, error ? "offer" : undefined)
}

export async function deleteOffer(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const { error } = await supabase
    .from("offers")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
  back(clientId, error ? "offer" : undefined)
}

export async function addNote(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!clientId) redirect("/clients")
  if (!body) back(clientId)
  const { error } = await supabase
    .from("client_notes")
    .insert({ agent_id: userId, client_id: clientId, body })
  back(clientId, error ? "note" : undefined)
}

export async function deleteNote(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = String(formData.get("clientId") ?? "")
  const { error } = await supabase
    .from("client_notes")
    .delete()
    .eq("id", String(formData.get("id") ?? ""))
  back(clientId, error ? "note" : undefined)
}
