"use server"

import { createClient } from "@/lib/supabase/server"
import { draftReminderFor, draftReplyFor } from "@/lib/assistant"

// Marvberry Assistant, called from the client page. Both return null when the
// assistant can't write (not on her plan, no key, any error); the page then
// keeps the plain draft or leaves the box for her.

export async function draftReminder(stepId: string): Promise<{ text: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !stepId) return { text: null }
  return { text: await draftReminderFor(supabase, user.id, stepId) }
}

export async function draftReply(clientId: string): Promise<{ text: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !clientId) return { text: null }
  return { text: await draftReplyFor(supabase, user.id, clientId) }
}
