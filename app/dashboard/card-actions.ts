"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

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
