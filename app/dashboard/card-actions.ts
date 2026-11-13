"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { igHandle } from "@/lib/instagram"

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function markReplied(id: string): Promise<void> {
  const { supabase, user } = await me()
  if (!user) return
  await supabase.from("card_requests").update({ replied_at: new Date().toISOString() }).eq("id", id).is("replied_at", null)
  revalidatePath("/dashboard")
}

// Turn a card request into a client, carrying over what they shared.
export async function makeClient(id: string): Promise<string | null> {
  const { supabase, user } = await me()
  if (!user) return null
  const { data: r } = await supabase.from("card_requests").select("name, email, phone, message, client_id").eq("id", id).maybeSingle()
  if (!r) return null
  if (r.client_id) return r.client_id as string
  const parts = String(r.name).trim().split(/\s+/)
  const first = parts.shift() ?? ""
  const { data: c } = await supabase
    .from("clients")
    .insert({ agent_id: user.id, first_name: first, last_name: parts.join(" "), email: r.email, phone: r.phone })
    .select("id")
    .single()
  if (!c) return null
  if (r.message) await supabase.from("client_notes").insert({ agent_id: user.id, client_id: c.id, body: `From their card request: “${r.message}”` })
  await supabase.from("card_requests").update({ client_id: c.id, replied_at: new Date().toISOString() }).eq("id", id)
  revalidatePath("/dashboard")
  return c.id as string
}

export async function saveGuide(title: string, url: string): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false, message: "Please sign in again." }
  const u = url.trim()
  if (u && !/^https?:\/\/\S+\.\S+/.test(u)) return { ok: false, message: "Paste the full link, starting with https://" }
  const { error } = await supabase
    .from("agents")
    .update({ guide_title: title.trim().slice(0, 80) || null, guide_url: u || null })
    .eq("id", user.id)
  if (error) return { ok: false, message: "Couldn’t save. Try again." }
  revalidatePath("/dashboard")
  return { ok: true, message: u ? "Saved. It’s on your card now." : "Removed from your card." }
}

// The details that show on the card.
export async function saveCardDetails(areas: string, address: string, website = "", instagram = ""): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false, message: "Please sign in again." }
  const w = website.trim()
  if (w && !/^https?:\/\/\S+\.\S+/.test(w)) return { ok: false, message: "Paste the full link, starting with https://" }
  const { error } = await supabase
    .from("agents")
    .update({ service_areas: areas.trim().slice(0, 120) || null, office_address: address.trim().slice(0, 200) || null })
    .eq("id", user.id)
  if (error) return { ok: false, message: "Couldn’t save. Try again." }
  await supabase
    .from("agents")
    .update({ website_url: w.slice(0, 300) || null, instagram: igHandle(instagram) || null })
    .eq("id", user.id)
  revalidatePath("/dashboard")
  return { ok: true, message: "Saved. It’s on your card now." }
}

// Start uploading the agent's guide (a PDF) to private storage.
export async function startGuideUpload(size: number): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const { user } = await me()
  if (!user) return { ok: false, error: "Please sign in again." }
  if (size > 25 * 1024 * 1024) return { ok: false, error: "That file is over 25 MB. Try a smaller PDF." }
  const path = `guides/${user.id}/${crypto.randomUUID()}.pdf`
  const { data, error } = await createAdminClient().storage.from("client-docs").createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: "Couldn’t start the upload. Try again." }
  return { ok: true, path, token: data.token }
}

export async function saveGuideFile(path: string, title: string, blurb: string): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false, message: "Please sign in again." }
  if (path && !path.startsWith(`guides/${user.id}/`)) return { ok: false, message: "Couldn’t save. Try again." }
  const patch: Record<string, string | null> = { guide_title: title.trim().slice(0, 80) || null, guide_blurb: blurb.trim().slice(0, 300) || null }
  if (path) patch.guide_path = path
  const { error } = await supabase.from("agents").update(patch).eq("id", user.id)
  if (error) return { ok: false, message: "Couldn’t save. Try again." }
  revalidatePath("/dashboard")
  return { ok: true, message: "Saved. It’s on your card now." }
}

export async function removeGuide(): Promise<void> {
  const { supabase, user } = await me()
  if (!user) return
  await supabase.from("agents").update({ guide_path: null, guide_url: null }).eq("id", user.id)
  revalidatePath("/dashboard")
}

// A free card account says yes to Marvberry: the rest of the app opens, with a
// fresh 14-day trial.
export async function startMarvberry(): Promise<boolean> {
  const { user } = await me()
  if (!user) return false
  const admin = createAdminClient()
  const { data: a } = await admin.from("agents").select("plan, subscription_status").eq("id", user.id).maybeSingle()
  if (a?.plan !== "card") return true
  const patch: Record<string, string> = { plan: "full" }
  if (!["active", "trialing", "past_due"].includes((a?.subscription_status as string) ?? "")) patch.trial_ends_at = new Date(Date.now() + 14 * 864e5).toISOString()
  const { error } = await admin.from("agents").update(patch).eq("id", user.id)
  revalidatePath("/", "layout")
  return !error
}
