import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { AUTO_FILL, parsePlaceholders } from "@/lib/placeholders"
import { agreementAuto, toAgreementSettings } from "@/lib/agreement"
import { sendEmail } from "@/lib/email"
import { signRequestEmail } from "@/lib/sign-email"
import { agentCard } from "@/lib/agent-card"

// The buyer agreement, filled from the agent's own template, the same way the
// client page does it. Used by the chat so Marvberry can prepare it and the
// agent can review and send it without leaving the conversation.

function todayLabel(timezone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone || "America/New_York", month: "long", day: "numeric", year: "numeric" }).format(new Date())
}

export type AgreementStatus =
  | { state: "no_template" }
  | { state: "signed"; title: string; signedAt: string }
  | { state: "sent"; title: string; sentAt: string }
  | { state: "missing"; title: string; templateId: string; missing: string[] }
  | { state: "ready"; title: string; templateId: string; body: string; email: string | null }

export async function prepareAgreement(
  db: SupabaseClient,
  agentId: string,
  clientId: string,
  deal: Record<string, string>,
): Promise<AgreementStatus> {
  const [{ data: client }, { data: agent }, { data: tpls }, { data: docs }] = await Promise.all([
    db.from("clients").select("id, first_name, last_name, email, phone, address").eq("id", clientId).maybeSingle(),
    db.from("agents").select("full_name, business_name, timezone, agreement_days, agreement_exclusive").eq("id", agentId).maybeSingle(),
    db.from("document_templates").select("id, title, body").eq("agent_id", agentId).order("created_at"),
    db.from("documents").select("title, status, created_at, signed_at").eq("client_id", clientId).eq("kind", "agreement").order("created_at", { ascending: false }),
  ])
  const signed = (docs ?? []).find((d) => d.status === "signed")
  if (signed) return { state: "signed", title: signed.title as string, signedAt: (signed.signed_at as string) || (signed.created_at as string) }
  const sent = (docs ?? []).find((d) => d.status === "sent")
  if (sent) return { state: "sent", title: sent.title as string, sentAt: sent.created_at as string }

  const list = (tpls ?? []) as { id: string; title: string; body: string }[]
  const tpl = list.find((t) => /agreement/i.test(t.title)) ?? list[0]
  if (!tpl || !client || !agent) return { state: "no_template" }

  const tz = (agent.timezone as string) || "America/New_York"
  const auto: Record<string, string> = {
    "client name": `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
    "client first name": (client.first_name as string) ?? "",
    "client last name": (client.last_name as string) ?? "",
    "client address": (client.address as string) ?? "",
    "client email": (client.email as string) ?? "",
    "client phone": (client.phone as string) ?? "",
    "agent name": (agent.full_name as string) ?? "",
    brokerage: (agent.business_name as string) ?? "",
    "business name": (agent.business_name as string) ?? "",
    date: todayLabel(tz),
    "today's date": todayLabel(tz),
    ...agreementAuto(toAgreementSettings(agent), tz),
  }
  const given: Record<string, string> = {}
  for (const [k, v] of Object.entries(deal)) given[k.trim().toLowerCase()] = String(v ?? "").trim()

  const missing = parsePlaceholders(tpl.body)
    .filter((p) => p.kind === "deal" && !given[p.key])
    .map((p) => p.label)
  if (missing.length) return { state: "missing", title: tpl.title, templateId: tpl.id, missing }

  const body = tpl.body.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const key = inner.trim().toLowerCase()
    return AUTO_FILL[key] !== undefined ? auto[key] ?? "" : given[key] ?? ""
  })
  return { state: "ready", title: tpl.title, templateId: tpl.id, body, email: (client.email as string) || null }
}

// The agent approved it: save it, put it in the client's thread, email the signing link.
export async function deliverAgreement(
  db: SupabaseClient,
  agentId: string,
  replyTo: string | undefined,
  origin: string,
  clientId: string,
  title: string,
  body: string,
): Promise<"sent" | "noemail" | "mailfail" | "error"> {
  const [{ data: client }, { data: agent }] = await Promise.all([
    db.from("clients").select("first_name, email").eq("id", clientId).maybeSingle(),
    db.from("agents").select("full_name, business_name").eq("id", agentId).maybeSingle(),
  ])
  if (!client || !agent) return "error"
  const { data: doc, error } = await db
    .from("documents")
    .insert({ agent_id: agentId, client_id: clientId, kind: "agreement", title: title.slice(0, 200), body, status: "sent" })
    .select("id, sign_token")
    .single()
  if (error || !doc) return "error"
  await db.from("messages").insert({ agent_id: agentId, client_id: clientId, sender: "agent", document_id: doc.id })
  if (!client.email) return "noemail"
  const mail = signRequestEmail({
    clientFirstName: (client.first_name as string) ?? "",
    agentName: (agent.full_name as string) || (agent.business_name as string) || "Your agent",
    title,
    link: `${origin}/sign/${doc.sign_token}`,
  })
  const ok = await sendEmail({
    to: client.email as string,
    ...mail,
    fromName: (agent.full_name as string) || (agent.business_name as string),
    card: await agentCard(agentId),
    replyTo,
  })
  return ok ? "sent" : "mailfail"
}
