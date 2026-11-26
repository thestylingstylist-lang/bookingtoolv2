"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { AUTO_FILL } from "@/lib/placeholders"
import { cleanDoc, leftoverBlanks, normalizeBlanks } from "@/lib/doc-text"
import { agreementAuto, toAgreementSettings } from "@/lib/agreement"
import { sendEmail } from "@/lib/email"
import { signRequestEmail, brokerRequestEmail } from "@/lib/sign-email"
import { startSigning } from "@/lib/signing"
import { agentCard } from "@/lib/agent-card"

type ClientRow = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
}

async function originUrl() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}

function todayLabel(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())
}

// Replace every blank with its value. Blanks may be written [[Label]], [Label] or {{Label}}.
// Auto blanks come from records; when a record is empty, or for deal blanks, the value comes
// from the form. Returns null while any blank would be left empty. The result is plain text.
function fillBody(
  body: string,
  auto: Record<string, string>,
  deal: Record<string, string>
): string | null {
  let missing = false
  const out = normalizeBlanks(body).replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const key = inner.trim().toLowerCase()
    const v = ((AUTO_FILL[key] !== undefined ? auto[key] : "") || deal[key] || "").trim()
    if (!v) missing = true
    return v
  })
  if (missing) return null
  const clean = cleanDoc(out)
  return leftoverBlanks(clean).length ? null : clean
}

// Post a text message into the client's thread.
export async function sendMessage(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const clientId = String(formData.get("clientId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!clientId) redirect("/clients")
  if (!body) redirect(`/clients/${clientId}`)

  const { error } = await supabase
    .from("messages")
    .insert({ agent_id: user.id, client_id: clientId, sender: "agent", body })

  if (error) redirect(`/clients/${clientId}?error=msg`)
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

// Build a document from a template, drop it into the thread, email the link.
export async function sendDocument(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const clientId = String(formData.get("clientId") ?? "")
  const templateId = String(formData.get("templateId") ?? "")
  const kind = formData.get("kind") === "disclosure" ? "disclosure" : "agreement"
  if (!clientId || !templateId) redirect(`/clients/${clientId}?error=doc`)

  const [{ data: clientData }, { data: template }, { data: agent }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone, address")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("document_templates")
      .select("id, title, body")
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("agents")
      .select("full_name, business_name, timezone")
      .eq("id", user.id)
      .maybeSingle(),
  ])
  const { data: agreementRow } = await supabase
    .from("agents")
    .select("agreement_days, agreement_exclusive")
    .eq("id", user.id)
    .maybeSingle()
  const client = clientData as ClientRow | null
  if (!client || !template || !agent) redirect(`/clients/${clientId}?error=doc`)

  const fullName = `${client.first_name} ${client.last_name}`.trim()
  const auto: Record<string, string> = {
    "client name": fullName,
    "client first name": client.first_name ?? "",
    "client last name": client.last_name ?? "",
    "client address": client.address ?? "",
    "client email": client.email ?? "",
    "client phone": client.phone ?? "",
    "agent name": agent.full_name ?? "",
    brokerage: agent.business_name ?? "",
    "business name": agent.business_name ?? "",
    date: todayLabel(agent.timezone),
    "today's date": todayLabel(agent.timezone),
    ...agreementAuto(toAgreementSettings(agreementRow), agent.timezone),
  }
  const deal: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("blank:")) deal[k.slice(6)] = String(v)
  }

  const body = fillBody(String(template.body ?? ""), auto, deal)
  if (body === null) redirect(`/clients/${clientId}?error=blanks`)
  // The agent signs first; the box on the form always starts unticked.
  if (formData.get("agentSign") !== "on") redirect(`/clients/${clientId}?error=sign`)

  const r = await startSigning(supabase, {
    agentId: user.id,
    clientId,
    kind,
    title: template.title,
    body,
    origin: await originUrl(),
    replyTo: user.email ?? undefined,
  })
  revalidatePath(`/clients/${clientId}`)
  if (r.state === "blanks") redirect(`/clients/${clientId}?error=blanks`)
  if (r.state === "error") redirect(`/clients/${clientId}?error=doc`)
  if (r.state === "broker") redirect(`/clients/${clientId}?doc=${r.mailed ? "broker" : "mailfail"}`)
  redirect(`/clients/${clientId}?doc=${r.result === "sent" ? "sent" : r.result}`)
}

// Email the signing link again.
export async function resendDocument(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const docId = String(formData.get("documentId") ?? "")
  const clientId = String(formData.get("clientId") ?? "")

  const [{ data: doc }, { data: client }, { data: agent }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, status, sign_token")
      .eq("id", docId)
      .maybeSingle(),
    supabase.from("clients").select("first_name, email").eq("id", clientId).maybeSingle(),
    supabase.from("agents").select("full_name, business_name").eq("id", user.id).maybeSingle(),
  ])
  if (!doc || !client || !agent || doc.status === "signed") redirect(`/clients/${clientId}`)
  if (doc.status === "draft") {
    // Still waiting on the broker: remind the broker, not the client.
    const { data: d } = await supabase.from("documents").select("broker_name, broker_email, broker_token, broker_signed_at").eq("id", docId).maybeSingle()
    if (!d?.broker_email || d.broker_signed_at) redirect(`/clients/${clientId}`)
    const mail = brokerRequestEmail({
      brokerName: (d.broker_name as string) || "",
      agentName: agent.full_name || agent.business_name || "Your agent",
      clientName: client.first_name || "your client",
      title: doc.title,
      link: `${await originUrl()}/cosign/${d.broker_token}`,
    })
    const sent = await sendEmail({ to: d.broker_email as string, ...mail, fromName: agent.full_name || agent.business_name, replyTo: user.email ?? undefined })
    redirect(`/clients/${clientId}?doc=${sent ? "broker" : "mailfail"}`)
  }
  if (!client.email) redirect(`/clients/${clientId}?doc=noemail`)

  const link = `${await originUrl()}/sign/${doc.sign_token}`
  const mail = signRequestEmail({
    clientFirstName: client.first_name ?? "",
    agentName: agent.full_name || agent.business_name || "Your agent",
    title: doc.title,
    link,
  })
  const ok = await sendEmail({
    to: client.email,
    ...mail,
    fromName: agent.full_name || agent.business_name,
    card: await agentCard(user.id),
    replyTo: user.email ?? undefined,
  })
  redirect(`/clients/${clientId}?doc=${ok ? "resent" : "mailfail"}`)
}
