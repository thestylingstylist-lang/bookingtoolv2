"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, userId: user?.id ?? null }
}

// She opened the jacket and saw it: the gold marker clears.
// No revalidate here, so what she's reading stays on screen until she leaves.
export async function markActivitySeen(clientId: string): Promise<void> {
  const { supabase, userId } = await me()
  if (!userId) return
  await supabase
    .from("client_activity")
    .update({ seen_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("agent_id", userId)
    .is("seen_at", null)
}

// "Keep for follow-up" keeps the jacket at the top of her list until she marks it done.
export async function setFollowUp(clientId: string, on: boolean): Promise<{ ok: boolean }> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false }
  const { error } = await supabase
    .from("clients")
    .update({ follow_up_at: on ? new Date().toISOString() : null })
    .eq("id", clientId)
    .eq("agent_id", userId)
  if (error) return { ok: false }
  revalidatePath("/clients")
  revalidatePath("/dashboard")
  return { ok: true }
}
