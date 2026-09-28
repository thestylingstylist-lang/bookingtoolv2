"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type FeedbackResult = { ok: boolean; message: string }

export async function sendFeedback(
  _prev: FeedbackResult | null,
  formData: FormData
): Promise<FeedbackResult> {
  const message = String(formData.get("message") ?? "").trim()
  if (!message) return { ok: false, message: "Please write something first." }
  if (message.length > 4000)
    return { ok: false, message: "That's a bit long — please keep it under 4000 characters." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let agentName: string | null = null
  if (user) {
    const { data } = await supabase
      .from("agents")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
    agentName = (data as { full_name?: string } | null)?.full_name ?? null
  }

  const admin = createAdminClient()
  const { error } = await admin.from("feedback").insert({
    agent_id: user?.id ?? null,
    agent_email: user?.email ?? null,
    agent_name: agentName,
    message,
  })
  if (error) return { ok: false, message: "Something went wrong — please try again." }

  return { ok: true, message: "Thank you — this really helps. We read every note." }
}
