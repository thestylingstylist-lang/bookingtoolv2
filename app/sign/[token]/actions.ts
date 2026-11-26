"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyAgent } from "@/lib/notify"
import { finishSigning } from "@/lib/signing"

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
  // The client signs last: only once the agent (and broker) have signed and released it.
  if (doc.status !== "sent") redirect(`/sign/${token}`)

  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null
  const signedAt = new Date().toISOString()

  const { data: updated, error } = await admin
    .from("documents")
    .update({ status: "signed", signer_name: name, signed_at: signedAt, signed_ip: ip })
    .eq("id", doc.id)
    .eq("status", "sent")
    .select("id")
  if (error) redirect(`/sign/${token}?error=save`)
  if (!updated || updated.length === 0) redirect(`/sign/${token}`)

  await admin.from("messages").insert({
    agent_id: doc.agent_id,
    client_id: doc.client_id,
    sender: "client",
    body: `Signed the ${doc.title}.`,
  })

  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  // Everyone has signed: keep the final PDF in the client's file and send both sides a copy.
  try {
    await finishSigning(doc.id as string, `${proto}://${host}`)
  } catch (err) {
    console.error("[sign] signed copy failed:", err)
  }

  // Let the realtor know on their phone or browser. Their emailed signed copy covers the rest.
  try {
    const { data: client } = await admin.from("clients").select("first_name").eq("id", doc.client_id).maybeSingle()
    const first = ((client?.first_name as string | null) || name.split(/\s+/)[0] || "Your client").trim()
    const what = `${first} signed the ${doc.title}`
    await notifyAgent(admin, doc.agent_id as string, "signed", { line: what, body: `${what}.`, url: `/clients/${doc.client_id}` })
  } catch (err) {
    console.error("[sign] notify failed:", err)
  }

  redirect(`/sign/${token}`)
}
