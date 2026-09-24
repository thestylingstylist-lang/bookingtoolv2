"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { signedNoticeEmail } from "@/lib/sign-email"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The client types their full name to sign. We record name, time, and IP.
export async function signDocument(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "")
  const name = String(formData.get("fullName") ?? "").trim()
  const agreed = formData.get("agree") === "on"
  if (!UUID_RE.test(token)) redirect("/")
  if (name.length < 2 || !agreed) redirect(`/sign/${token}?error=1`)

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("id, agent_id, client_id, title, status")
    .eq("sign_token", token)
    .maybeSingle()
  if (!doc) redirect("/")
  if (doc.status === "signed") redirect(`/sign/${token}`)

  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null
  const signedAt = new Date().toISOString()

  const { data: updated, error } = await admin
    .from("documents")
    .update({ status: "signed", signer_name: name, signed_at: signedAt, signed_ip: ip })
    .eq("id", doc.id)
    .neq("status", "signed")
    .select("id")
  if (error) redirect(`/sign/${token}?error=save`)
  if (!updated || updated.length === 0) redirect(`/sign/${token}`)

  await admin.from("messages").insert({
    agent_id: doc.agent_id,
    client_id: doc.client_id,
    sender: "client",
    body: `Signed the ${doc.title}.`,
  })

  // Let the realtor know. A failed email must not undo the signature.
  try {
    const [{ data: client }, { data: agent }, { data: authUser }] = await Promise.all([
      admin.from("clients").select("first_name, last_name").eq("id", doc.client_id).maybeSingle(),
      admin.from("agents").select("timezone").eq("id", doc.agent_id).maybeSingle(),
      admin.auth.admin.getUserById(doc.agent_id),
    ])
    const to = authUser?.user?.email
    if (to) {
      const host = h.get("x-forwarded-host") ?? h.get("host")
      const proto = h.get("x-forwarded-proto") ?? "https"
      const signedLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: agent?.timezone || "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(signedAt))
      const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : name
      const mail = signedNoticeEmail({
        clientName: clientName || name,
        title: doc.title,
        signedLabel,
        link: `${proto}://${host}/clients/${doc.client_id}`,
      })
      await sendEmail({ to, ...mail, fromName: "Marvberry" })
    }
  } catch (err) {
    console.error("[sign] notify failed:", err)
  }

  redirect(`/sign/${token}`)
}
