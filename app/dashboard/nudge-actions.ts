"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import { nudgeEmail } from "@/lib/nudge-email"

// One tap: the reminder goes into the client's thread and to their inbox, in
// the realtor's name. Nothing is ever sent without this tap.
export async function sendNudge(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const stepId = String(formData.get("stepId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  const fromClient = formData.get("from") === "client"
  if (!stepId || !body) redirect("/dashboard")

  const { data: step } = await supabase.from("steps").select("id, client_id, done, nudged_at").eq("id", stepId).maybeSingle()
  if (!step || step.done) redirect("/dashboard")
  const back = (k: string) =>
    fromClient ? `/clients/${step.client_id}?step=${stepId}&nudge=${k}#step-${stepId}` : `/dashboard?nudge=${k}`

  const [{ data: client }, { data: agent }] = await Promise.all([
    supabase.from("clients").select("email, portal_token").eq("id", step.client_id).maybeSingle(),
    supabase.from("agents").select("full_name, business_name, public_email").eq("id", user.id).maybeSingle(),
  ])
  if (!client?.email) redirect(back("noemail"))

  const agentName = agent?.full_name || agent?.business_name || "Your agent"
  const mail = nudgeEmail({ agentName, body, link: `https://marvberry.com/portal/${client.portal_token}` })
  const ok = await sendEmail({
    to: client.email,
    ...mail,
    fromName: agentName,
    replyTo: agent?.public_email || user.email || undefined,
  })
  if (!ok) redirect(back("fail"))

  await Promise.all([
    supabase.from("messages").insert({ agent_id: user.id, client_id: step.client_id, sender: "agent", body }),
    supabase.from("steps").update({ nudged_at: new Date().toISOString() }).eq("id", stepId),
  ])
  revalidatePath("/dashboard")
  revalidatePath(`/clients/${step.client_id}`)
  redirect(back("sent"))
}

export async function skipNudge(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const stepId = String(formData.get("stepId") ?? "")
  if (stepId) await supabase.from("steps").update({ nudged_at: new Date().toISOString() }).eq("id", stepId)
  revalidatePath("/dashboard")
  redirect("/dashboard")
}
