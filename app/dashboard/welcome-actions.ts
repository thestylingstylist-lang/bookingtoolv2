"use server"
import { createClient } from "@/lib/supabase/server"

// Onboarding chat: what the agent calls their assistant.
// If the assistant_name column isn't added yet, this quietly does nothing.
export async function saveAssistantName(name: string) {
  const clean = name.trim().slice(0, 30)
  if (!clean) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("agents").update({ assistant_name: clean }).eq("id", user.id)
}

// Onboarding chat: the brokerage clients see on the booking page.
export async function saveBrokerage(name: string) {
  const clean = name.trim().slice(0, 120)
  if (!clean) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("agents").update({ business_name: clean }).eq("id", user.id)
}
