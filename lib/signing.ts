import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { brokerRequestEmail, signRequestEmail, signedCopyEmail } from "@/lib/sign-email"
import { agentCard } from "@/lib/agent-card"
import { buildSignedPdf, type Signer } from "@/lib/signed-pdf"
import { cleanDoc, leftoverBlanks } from "@/lib/doc-text"
import { tickStep } from "@/lib/auto-steps"

// The signing order, in one place:
//   1. The agent signs when they send it. The document is saved as a draft.
//   2. If the agent has a broker in Settings, the broker gets a private link and signs next.
//   3. Only then is it released to the client (status "sent"), who signs last.
//   4. Once everyone has signed, the final PDF is saved in the client's file and emailed to both.

const BUCKET = "client-docs"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type StartResult =
  | { state: "broker"; brokerName: string; mailed: boolean; docId: string }
  | { state: "client"; result: "sent" | "noemail" | "mailfail"; docId: string }
  | { state: "blanks"; blanks: string[] }
  | { state: "error" }

export async function startSigning(
  db: SupabaseClient,
  o: { agentId: string; clientId: string; kind: "agreement" | "disclosure"; title: string; body: string; origin: string; replyTo?: string },
): Promise<StartResult> {
  const body = cleanDoc(o.body)
  const blanks = leftoverBlanks(body)
  if (blanks.length) return { state: "blanks", blanks }

  const [{ data: agent }, { data: client }] = await Promise.all([
    db.from("agents").select("full_name, business_name, broker_name, broker_email").eq("id", o.agentId).maybeSingle(),
    db.from("clients").select("first_name, last_name").eq("id", o.clientId).maybeSingle(),
  ])
  if (!agent || !client) return { state: "error" }
  const agentName = ((agent.full_name as string) || (agent.business_name as string) || "").trim()
  if (!agentName) return { state: "error" }
  const brokerName = ((agent.broker_name as string) || "").trim()
  const brokerEmail = ((agent.broker_email as string) || "").trim().toLowerCase()
  const hasBroker = !!brokerName && EMAIL_RE.test(brokerEmail)

  const { data: doc, error } = await db
    .from("documents")
    .insert({
      agent_id: o.agentId,
      client_id: o.clientId,
      kind: o.kind,
      title: o.title.slice(0, 200),
      body,
      status: "draft",
      agent_signed_name: agentName,
      agent_signed_at: new Date().toISOString(),
      broker_name: hasBroker ? brokerName : null,
      broker_email: hasBroker ? brokerEmail : null,
    })
    .select("id, broker_token")
    .single()
  if (error || !doc) {
    console.error("[signing] draft insert failed:", error?.message)
    return { state: "error" }
  }

  if (hasBroker) {
    const clientName = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "your client"
    const mail = brokerRequestEmail({ brokerName, agentName, clientName, title: o.title, link: `${o.origin}/cosign/${doc.broker_token}` })
    const mailed = await sendEmail({ to: brokerEmail, ...mail, fromName: agentName, replyTo: o.replyTo })
    return { state: "broker", brokerName, mailed, docId: doc.id as string }
  }
  const result = await releaseToClient(db, doc.id as string, o.origin, o.replyTo)
  return result === "error" ? { state: "error" } : { state: "client", result, docId: doc.id as string }
}

// Everyone before the client has signed: the client can now see it and sign.
export async function releaseToClient(db: SupabaseClient, docId: string, origin: string, replyTo?: string): Promise<"sent" | "noemail" | "mailfail" | "error"> {
  const { data: doc } = await db.from("documents").select("id, agent_id, client_id, title, sign_token, status").eq("id", docId).maybeSingle()
  if (!doc) return "error"
  if (doc.status === "draft") {
    const { error } = await db.from("documents").update({ status: "sent" }).eq("id", docId).eq("status", "draft")
    if (error) return "error"
    await db.from("messages").insert({ agent_id: doc.agent_id, client_id: doc.client_id, sender: "agent", document_id: doc.id })
  }
  const [{ data: client }, { data: agent }] = await Promise.all([
    db.from("clients").select("first_name, email").eq("id", doc.client_id).maybeSingle(),
    db.from("agents").select("full_name, business_name").eq("id", doc.agent_id).maybeSingle(),
  ])
  if (!client?.email) return "noemail"
  const agentName = (agent?.full_name as string) || (agent?.business_name as string) || "Your agent"
  const mail = signRequestEmail({ clientFirstName: (client.first_name as string) ?? "", agentName, title: doc.title as string, link: `${origin}/sign/${doc.sign_token}` })
  const ok = await sendEmail({ to: client.email as string, ...mail, fromName: agentName, card: await agentCard(doc.agent_id as string), replyTo })
  return ok ? "sent" : "mailfail"
}

type DocRow = {
  id: string
  agent_id: string
  client_id: string
  title: string
  body: string | null
  signer_name: string | null
  signed_at: string | null
  signed_ip: string | null
  agent_signed_name: string | null
  agent_signed_at: string | null
  broker_name: string | null
  broker_signed_name: string | null
  broker_signed_at: string | null
  broker_signed_ip: string | null
  signed_pdf_path: string | null
}
const DOC_COLS =
  "id, agent_id, client_id, title, body, signer_name, signed_at, signed_ip, agent_signed_name, agent_signed_at, broker_name, broker_signed_name, broker_signed_at, broker_signed_ip, signed_pdf_path"

// Who signed, in order, for the page and the PDF. Nobody is listed without a signature.
export function signersOf(d: Omit<DocRow, "id" | "agent_id" | "client_id" | "title" | "body" | "signed_pdf_path">, clientRole: string): Signer[] {
  const out: Signer[] = []
  if (d.agent_signed_name && d.agent_signed_at) out.push({ role: "Agent’s signature", name: d.agent_signed_name, at: d.agent_signed_at })
  if (d.broker_signed_name && d.broker_signed_at) out.push({ role: "Broker’s signature", name: d.broker_signed_name, at: d.broker_signed_at, ip: d.broker_signed_ip })
  if (d.signer_name && d.signed_at) out.push({ role: clientRole, name: d.signer_name, at: d.signed_at, ip: d.signed_ip })
  return out
}

export const clientRoleOf = (clientType?: string | null) => (clientType === "seller" ? "Seller’s signature" : "Buyer’s signature")

// The signed PDF: made once, kept in the client's file. Made on the spot for older signed documents.
export async function signedPdf(docId: string): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("documents").select(`${DOC_COLS}, status`).eq("id", docId).maybeSingle()
  const d = data as (DocRow & { status: string }) | null
  if (!d || d.status !== "signed") return null
  const filename = `${d.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "Agreement"}-signed.pdf`
  if (d.signed_pdf_path) {
    const { data: file } = await admin.storage.from(BUCKET).download(d.signed_pdf_path)
    if (file) return { bytes: new Uint8Array(await file.arrayBuffer()), filename }
  }
  const [{ data: agent }, { data: client }] = await Promise.all([
    admin.from("agents").select("full_name, business_name, timezone").eq("id", d.agent_id).maybeSingle(),
    admin.from("clients").select("client_type").eq("id", d.client_id).maybeSingle(),
  ])
  const bytes = await buildSignedPdf({
    title: d.title,
    body: d.body ?? "",
    preparedBy: (agent?.full_name as string) || (agent?.business_name as string) || "Your agent",
    brokerage: agent?.full_name ? (agent?.business_name as string) || undefined : undefined,
    tz: (agent?.timezone as string) || "America/New_York",
    signers: signersOf(d, clientRoleOf(client?.client_type as string | null)),
    docId: d.id,
  })
  const pdfPath = `${d.agent_id}/${d.client_id}/signed/${d.id}.pdf`
  const { error } = await admin.storage.from(BUCKET).upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true })
  if (!error) await admin.from("documents").update({ signed_pdf_path: pdfPath }).eq("id", d.id)
  else console.error("[signing] pdf upload failed:", error.message)
  return { bytes, filename }
}

// The client signed last: keep the final PDF and send a copy to both sides.
export async function finishSigning(docId: string, origin: string): Promise<void> {
  const admin = createAdminClient()
  const pdf = await signedPdf(docId)
  if (!pdf) return
  const { data: doc } = await admin.from("documents").select("agent_id, client_id, title, sign_token, kind").eq("id", docId).maybeSingle()
  if (!doc) return
  // The agreement is signed: that step is done for both sides.
  if (doc.kind === "agreement") await tickStep(admin, doc.client_id as string, "Agreement signed")
  const [{ data: client }, { data: agent }] = await Promise.all([
    admin.from("clients").select("first_name, email").eq("id", doc.client_id).maybeSingle(),
    admin.from("agents").select("full_name, business_name").eq("id", doc.agent_id).maybeSingle(),
  ])
  // Looked up on its own: if it fails, the client's copy still goes out.
  const authUser = await admin.auth.admin.getUserById(doc.agent_id as string).then((r) => r.data).catch(() => null)
  const agentName = (agent?.full_name as string) || (agent?.business_name as string) || "Your agent"
  const attachments = [{ filename: pdf.filename, content: Buffer.from(pdf.bytes).toString("base64") }]
  if (client?.email) {
    const mail = signedCopyEmail({ firstName: (client.first_name as string) ?? "", title: doc.title as string, link: `${origin}/sign/${doc.sign_token}`, fromAgent: agentName, toClient: true })
    await sendEmail({ to: client.email as string, ...mail, fromName: agentName, card: await agentCard(doc.agent_id as string), attachments })
  }
  const agentEmail = authUser?.user?.email
  if (agentEmail) {
    const mail = signedCopyEmail({ firstName: agentName.split(/\s+/)[0], title: doc.title as string, link: `${origin}/clients/${doc.client_id}`, fromAgent: agentName, toClient: false })
    await sendEmail({ to: agentEmail, ...mail, fromName: "Marvberry", attachments })
  }
}
