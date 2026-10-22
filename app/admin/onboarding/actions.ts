"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, small, esc } from "@/lib/letter"
import { redirect } from "next/navigation"
import { fromZonedTime } from "date-fns-tz"
import { cancelScheduledEmail } from "@/lib/email"
import { sendCallEmail, scheduleHourEmail, TEAM_TZ, type CallRow, type CallFor } from "@/lib/onboarding-call"

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

// ---- Follow-up calls ---------------------------------------------------------

async function callPerson(admin: ReturnType<typeof createAdminClient>, agent_id: string): Promise<CallFor | null> {
  const [{ data: ag }, { data: au }] = await Promise.all([
    admin.from("agents").select("full_name, timezone, public_phone").eq("id", agent_id).maybeSingle(),
    admin.auth.admin.getUserById(agent_id),
  ])
  const email = au?.user?.email
  if (!email) return null
  return {
    first: ((ag?.full_name as string) || "").trim().split(/\s+/)[0],
    email,
    tz: (ag?.timezone as string) || TEAM_TZ,
    phone: (ag?.public_phone as string) || "",
  }
}

// Book a follow-up call: emails the realtor now, and an hour before.
// The morning job sends the day-before reminder.
export async function scheduleCall(formData: FormData) {
  const admin = await requireAdmin()
  const agent_id = agentIdFrom(formData)
  const date = String(formData.get("date") ?? "")
  const time = String(formData.get("time") ?? "")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) redirect(`/admin/onboarding?a=${agent_id}&call=bad`)
  const call_at = fromZonedTime(`${date}T${time}:00`, TEAM_TZ)
  if (call_at.getTime() < Date.now()) redirect(`/admin/onboarding?a=${agent_id}&call=past`)
  const how = formData.get("how") === "phone" ? "phone" : "video"
  const note = String(formData.get("note") ?? "").trim().slice(0, 300)
  const { data: ob } = await admin.from("onboarding").select("owner").eq("agent_id", agent_id).maybeSingle()
  const owner = (ob?.owner as string) || "Alecia"

  const { data: row, error } = await admin
    .from("onboarding_calls")
    .insert({ agent_id, call_at: call_at.toISOString(), how, note, owner })
    .select("id, agent_id, call_at, how, note, owner")
    .single()
  if (error || !row) redirect(`/admin/onboarding?a=${agent_id}&call=fail`)

  const who = await callPerson(admin, agent_id)
  let sent = false
  if (who) {
    sent = await sendCallEmail("booked", row as CallRow, who)
    const hourId = await scheduleHourEmail(row as CallRow, who)
    // Booked for tomorrow or sooner: the booking email already did the day-before job.
    const soon = call_at.getTime() - Date.now() < 36 * 60 * 60 * 1000
    await admin
      .from("onboarding_calls")
      .update({ hour_email_id: hourId, ...(soon ? { day_sent_at: new Date().toISOString() } : {}) })
      .eq("id", (row as CallRow).id)
  }
  refresh()
  revalidatePath("/admin")
  redirect(`/admin/onboarding?a=${agent_id}&call=${sent ? "sent" : "nomail"}`)
}

export async function cancelCall(formData: FormData) {
  const admin = await requireAdmin()
  const id = String(formData.get("call_id") ?? "")
  if (!UUID_RE.test(id)) return
  const { data: row } = await admin
    .from("onboarding_calls")
    .select("id, agent_id, call_at, how, note, owner, hour_email_id, cancelled_at")
    .eq("id", id)
    .maybeSingle()
  if (!row || row.cancelled_at) return
  await admin.from("onboarding_calls").update({ cancelled_at: new Date().toISOString() }).eq("id", id)
  if (row.hour_email_id) await cancelScheduledEmail(row.hour_email_id as string)
  const who = await callPerson(admin, row.agent_id as string)
  if (who) await sendCallEmail("cancelled", row as unknown as CallRow, who)
  refresh()
  revalidatePath("/admin")
}
