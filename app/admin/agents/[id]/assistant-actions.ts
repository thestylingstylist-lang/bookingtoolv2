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
