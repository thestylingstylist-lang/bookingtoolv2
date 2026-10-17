"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, small, esc } from "@/lib/letter"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")
  return createAdminClient()
}

function refresh() {
  revalidatePath("/admin/onboarding")
  revalidatePath("/dashboard")
}

function agentIdFrom(formData: FormData) {
  const id = String(formData.get("agent_id") ?? "")
  if (!UUID_RE.test(id)) throw new Error("Bad id")
  return id
}

export async function startOnboarding(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const owner = String(formData.get("owner") ?? "").trim() || "Alecia"
  await admin.from("onboarding").upsert({ agent_id, owner }, { onConflict: "agent_id", ignoreDuplicates: true })
  refresh()
}

export async function setOwner(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const owner = String(formData.get("owner") ?? "").trim().slice(0, 60)
  if (!owner) return
  await admin.from("onboarding").update({ owner }).eq("agent_id", agent_id)
  refresh()
}

export async function toggleSetupCall(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const done = formData.get("done") === "1"
  await admin
    .from("onboarding")
    .update({ setup_call_done: done, setup_call_at: done ? new Date().toISOString() : null })
    .eq("agent_id", agent_id)
  refresh()
}

// Ask the realtor for documents: one per line, one email for the lot.
export async function requestDocs(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const titles = String(formData.get("titles") ?? "")
    .split("\n")
    .map((t) => t.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 12)
  if (!titles.length) return
  const { error } = await admin.from("onboarding_docs").insert(titles.map((title) => ({ agent_id, title })))
  if (error) return

  const [{ data: ob }, { data: ag }, { data: au }] = await Promise.all([
    admin.from("onboarding").select("owner").eq("agent_id", agent_id).maybeSingle(),
    admin.from("agents").select("full_name").eq("id", agent_id).maybeSingle(),
    admin.auth.admin.getUserById(agent_id),
  ])
  const to = au?.user?.email
  if (to) {
    const owner = (ob?.owner as string) || "Alecia"
    const first = ((ag?.full_name as string) || "").trim().split(/\s+/)[0]
    const list = titles.map((t) => `• ${esc(t)}`).join("<br>")
    const html = teamNote(
      "Your setup: a few documents",
      para(`Hi${first ? ` ${esc(first)}` : ""}, I'm setting up your account. Please send me these so I can turn them into ready-to-use templates for you:`) +
        para(list) +
        button("https://www.marvberry.com/dashboard", "Upload in Marvberry") +
        small(`Questions? Message me right there in your Marvberry. ${esc(owner)}`),
    )
    const text = `Hi${first ? ` ${first}` : ""}, I'm setting up your account. Please send me these so I can turn them into ready-to-use templates for you:\n\n${titles.map((t) => `- ${t}`).join("\n")}\n\nUpload in Marvberry: https://www.marvberry.com/dashboard\n\n${owner}`
    await sendEmail({ to, subject: "Your Marvberry setup: a few documents", html, text, fromName: `${owner} at Marvberry`, replyTo: "team@marvberry.com" })
  }
  refresh()
}

export async function toggleTemplate(formData: FormData) {
  const admin = await requireAdmin()
  const id = String(formData.get("doc_id") ?? "")
  if (!UUID_RE.test(id)) return
  await admin.from("onboarding_docs").update({ template_built: formData.get("built") === "1" }).eq("id", id)
  refresh()
}

export async function removeDoc(formData: FormData) {
  const admin = await requireAdmin()
  const id = String(formData.get("doc_id") ?? "")
  if (!UUID_RE.test(id)) return
  const { data } = await admin.from("onboarding_docs").select("file_path").eq("id", id).maybeSingle()
  if (data?.file_path) await admin.storage.from("onboarding-docs").remove([data.file_path as string])
  await admin.from("onboarding_docs").delete().eq("id", id)
  refresh()
}

// Complete: the setup card leaves their home page; the chat carries on as Support.
export async function setComplete(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const done = formData.get("done") === "1"
  await admin.from("onboarding").update({ completed_at: done ? new Date().toISOString() : null }).eq("agent_id", agent_id)
  refresh()
}
