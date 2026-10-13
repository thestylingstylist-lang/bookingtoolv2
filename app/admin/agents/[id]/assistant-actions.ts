"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

// The team turns Marvberry Assistant on or off for one realtor.
export async function setAssistantPlan(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const on = formData.get("on") === "1"
  if (!agentId) return

  const admin = createAdminClient()
  if (on) await admin.from("assistant_plans").upsert({ agent_id: agentId })
  else await admin.from("assistant_plans").delete().eq("agent_id", agentId)
  revalidatePath(`/admin/agents/${agentId}`)
}

// The team gives a realtor more trial time, for customer service. Days are
// added from today if the trial already ended, or from its end date if not.
export async function extendTrial(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const days = Number(formData.get("days") ?? 0)
  if (!agentId || !Number.isFinite(days) || days < 1 || days > 365) return

  const admin = createAdminClient()
  const { data: agent } = await admin.from("agents").select("trial_ends_at").eq("id", agentId).maybeSingle()
  const current = agent?.trial_ends_at ? new Date(agent.trial_ends_at as string).getTime() : 0
  const from = Math.max(current, Date.now())
  const ends = new Date(from + days * 86_400_000).toISOString()
  await admin.from("agents").update({ trial_ends_at: ends }).eq("id", agentId)
  revalidatePath(`/admin/agents/${agentId}`)
  revalidatePath("/admin/agents")
}
