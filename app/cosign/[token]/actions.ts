"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyAgent } from "@/lib/notify"
import { releaseToClient } from "@/lib/signing"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The broker co-signs after the agent. Then, and only then, it goes to the client.
export async function cosignDocument(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "")
  const name = String(formData.get("fullName") ?? "").trim()
  const agreed = formData.get("agree") === "on"
  if (!UUID_RE.test(token)) redirect("/")
  if (name.length < 2 || !agreed) redirect(`/cosign/${token}?error=1`)

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("id, agent_id, client_id, title, status, broker_signed_at")
    .eq("broker_token", token)
    .maybeSingle()
  if (!doc) redirect("/")
  if (doc.broker_signed_at || doc.status !== "draft") redirect(`/cosign/${token}`)

  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null
  const { data: updated, error } = await admin
    .from("documents")
    .update({ broker_signed_name: name, broker_signed_at: new Date().toISOString(), broker_signed_ip: ip })
    .eq("id", doc.id)
    .is("broker_signed_at", null)
    .select("id")
  if (error) redirect(`/cosign/${token}?error=save`)
  if (!updated || updated.length === 0) redirect(`/cosign/${token}`)

  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`
  try {
    const result = await releaseToClient(admin, doc.id as string, origin)
    const { data: client } = await admin.from("clients").select("first_name").eq("id", doc.client_id).maybeSingle()
    const first = ((client?.first_name as string | null) || "Your client").trim()
    const line =
      result === "sent"
        ? `${name} co-signed the ${doc.title}. It's with ${first} to sign.`
        : `${name} co-signed the ${doc.title}. Add ${first}'s email so they get the signing link.`
    await notifyAgent(admin, doc.agent_id as string, "signed", { line, body: line, url: `/clients/${doc.client_id}` })
  } catch (err) {
    console.error("[cosign] release failed:", err)
  }
  redirect(`/cosign/${token}`)
}
