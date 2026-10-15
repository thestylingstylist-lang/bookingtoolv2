"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, small, esc } from "@/lib/letter"

export type SupportResult = { ok: boolean; message: string }

// An agent sends a message to the team.
export async function sendSupportMessage(
  _prev: SupportResult | null,
  formData: FormData
): Promise<SupportResult> {
  const body = String(formData.get("body") ?? "").trim()
  if (!body) return { ok: false, message: "Please write something first." }
  if (body.length > 4000)
    return { ok: false, message: "That's a bit long — please keep it under 4000 characters." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  let agentName: string | null = null
  const { data } = await supabase
    .from("agents")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()
  agentName = (data as { full_name?: string } | null)?.full_name ?? null

  const admin = createAdminClient()
  const { error } = await admin.from("support_messages").insert({
    agent_id: user.id,
    agent_email: user.email ?? null,
    agent_name: agentName,
    body,
    from_team: false,
    read_by_team: false,
    read_by_agent: true,
  })
  if (error) return { ok: false, message: "Something went wrong — please try again." }

  revalidatePath("/support")
  return { ok: true, message: "Got it — we'll get back to you soon." }
}

// The team replies to an agent's thread.
export async function sendTeamReply(
  _prev: SupportResult | null,
  formData: FormData
): Promise<SupportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: "Not allowed." }

  const agentId = String(formData.get("agent_id") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!agentId || !body) return { ok: false, message: "Please write a reply." }

  const admin = createAdminClient()
  const { error } = await admin.from("support_messages").insert({
    agent_id: agentId,
    body,
    from_team: true,
    read_by_team: true,
    read_by_agent: false,
  })
  if (error) return { ok: false, message: "Couldn't send — try again." }

  // Mark the agent's messages in this thread as read by the team.
  await admin
    .from("support_messages")
    .update({ read_by_team: true })
    .eq("agent_id", agentId)
    .eq("from_team", false)

  // Also email it, so it reaches them even if they can't sign in.
  const { data: u } = await admin.auth.admin.getUserById(agentId)
  const to = u?.user?.email
  let emailed = false
  if (to) {
    const paras = body
      .split(/\n{2,}/)
      .map((p) => para(esc(p).replace(/\n/g, "<br>")))
      .join("")
    const html = teamNote(
      "A message from the Marvberry team",
      paras +
        button("https://www.marvberry.com/support", "Reply in Marvberry") +
        small("Or just reply to this email. It comes straight to us."),
    )
    const text = `${body}\n\nReply in Marvberry: https://www.marvberry.com/support\nOr just reply to this email.`
    emailed = await sendEmail({ to, subject: "A message from the Marvberry team", html, text, fromName: "Alecia at Marvberry", replyTo: "team@marvberry.com" })
  }

  revalidatePath("/admin/messages")
  revalidatePath("/support")
  const at = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date())
  return {
    ok: true,
    message: emailed ? `Sent and emailed to ${to} at ${at}.` : "Saved in their Marvberry, but the email didn't go out. Try again.",
  }
}
