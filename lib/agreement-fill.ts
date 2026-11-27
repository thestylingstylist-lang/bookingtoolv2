import { loadReplaced } from "./auto-steps"
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { AUTO_FILL, parsePlaceholders } from "@/lib/placeholders"
import { agreementAuto, toAgreementSettings } from "@/lib/agreement"
import { startSigning, type StartResult } from "@/lib/signing"
import { cleanDoc, leftoverBlanks, normalizeBlanks } from "@/lib/doc-text"

// The buyer agreement, filled from the agent's own template, the same way the
// client page does it. Used by the chat so Marvberry can prepare it and the
// agent can review and send it without leaving the conversation.

function todayLabel(timezone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone || "America/New_York", month: "long", day: "numeric", year: "numeric" }).format(new Date())
}

// "Client’s Name (s)" -> "clientname"
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/'s\b/g, "")
    .replace(/\(s\)/g, "")
    .replace(/[^a-z0-9]/g, "")
}

// Other ways templates word the blanks we already know.
const ALIASES: Record<string, string> = {
  client: "client name",
  clientfullname: "client name",
  buyer: "client name",
  buyers: "client name",
  buyername: "client name",
  buyersname: "client name",
  buyerfullname: "client name",
  purchaser: "client name",
  purchasername: "client name",
  nameofbuyer: "client name",
  nameofclient: "client name",
  buyeraddress: "client address",
  clientcurrentaddress: "client address",
  buyeremail: "client email",
  buyerphone: "client phone",
  agent: "agent name",
  buyeragent: "agent name",
  buyersagent: "agent name",
  firm: "brokerage",
  brokeragename: "brokerage",
  commission: "commission",
  commissionrate: "commission",
  commissionpercent: "commission",
  compensation: "commission",
  buyeragentcompensation: "commission",
  brokercompensation: "commission",
  brokeragefee: "commission",
  propertyaddress: "property address",
  listingaddress: "property address",
  subjectproperty: "property address",
  subjectpropertyaddress: "property address",
  addressofproperty: "property address",
  homeaddress: "property address",
}

export type AgreementStatus =
  | { state: "no_template" }
  | { state: "no_client" }
  | { state: "signed"; title: string; signedAt: string; documentId: string }
  | { state: "sent"; title: string; sentAt: string; documentId: string }
  | { state: "missing"; title: string; templateId: string; missing: string[] }
  | { state: "ready"; title: string; templateId: string; body: string; email: string | null }

export async function prepareAgreement(
  db: SupabaseClient,
  agentId: string,
  clientId: string,
  deal: Record<string, string>,
  opts: { templateId?: string; ignoreExisting?: boolean } = {},
): Promise<AgreementStatus> {
  // Each read stands on its own: a setting that isn't in the database yet must never
  // make the agent's template look missing.
  const one = async <T,>(q: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try {
      const r = await q
      return r.error ? null : r.data
    } catch {
      return null
    }
  }
  const [client0, agentBase, agentTerms, agentCommission, tpls, docs] = await Promise.all([
    one<Record<string, unknown>>(db.from("clients").select("id, first_name, last_name, email, phone, address, sale_address").eq("id", clientId).maybeSingle()),
    one<Record<string, unknown>>(db.from("agents").select("full_name, business_name, timezone").eq("id", agentId).maybeSingle()),
    one<Record<string, unknown>>(db.from("agents").select("agreement_days, agreement_exclusive").eq("id", agentId).maybeSingle()),
    one<Record<string, unknown>>(db.from("agents").select("default_commission").eq("id", agentId).maybeSingle()),
    one<{ id: string; title: string; body: string }[]>(db.from("document_templates").select("id, title, body").eq("agent_id", agentId).order("created_at")),
    one<{ id: string; title: string; status: string; created_at: string; signed_at: string | null }[]>(
      db.from("documents").select("id, title, status, created_at, signed_at").eq("client_id", clientId).eq("kind", "agreement").order("created_at", { ascending: false }),
    ),
  ])
  // A client saved before sale_address existed: read the basics instead.
  const client =
    client0 ?? (await one<Record<string, unknown>>(db.from("clients").select("id, first_name, last_name, email, phone, address").eq("id", clientId).maybeSingle()))
  const agent = agentBase ? { ...agentBase, ...(agentTerms ?? {}), ...(agentCommission ?? {}) } : null
  if (!client) return { state: "no_client" }
  // A signed agreement that's been redone (Replaced) doesn't count: a new one can be prepared.
  const replaced = await loadReplaced(db, clientId)
  const signed = opts.ignoreExisting ? undefined : (docs ?? []).find((d) => d.status === "signed" && !replaced.has(d.id as string))
  if (signed) return { state: "signed", title: signed.title as string, signedAt: (signed.signed_at as string) || (signed.created_at as string), documentId: signed.id }
  const sent = opts.ignoreExisting ? undefined : (docs ?? []).find((d) => d.status === "sent" || d.status === "draft")
  if (sent) return { state: "sent", title: sent.title as string, sentAt: sent.created_at as string, documentId: sent.id }

  const list = (tpls ?? []) as { id: string; title: string; body: string }[]
  // Always the agent's own agreement from their Templates.
  const tpl = (opts.templateId ? list.find((t) => t.id === opts.templateId) : undefined) ?? list.find((t) => /agreement/i.test(t.title)) ?? list[0]
  if (!tpl) return { state: "no_template" }
  const agentRow = agent ?? { full_name: "", business_name: "", timezone: "America/New_York" }

  const tz = (agentRow.timezone as string) || "America/New_York"
  const auto: Record<string, string> = {
    "client name": `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
    "client first name": (client.first_name as string) ?? "",
    "client last name": (client.last_name as string) ?? "",
    "client address": (client.address as string) ?? "",
    "client email": (client.email as string) ?? "",
    "client phone": (client.phone as string) ?? "",
    "agent name": (agentRow.full_name as string) ?? "",
    brokerage: (agentRow.business_name as string) ?? "",
    "business name": (agentRow.business_name as string) ?? "",
    date: todayLabel(tz),
    "today's date": todayLabel(tz),
    commission: (((agentRow as Record<string, unknown>).default_commission as string) ?? "").trim(),
    "property address": ((client.sale_address as string) ?? "").trim(),
    ...agreementAuto(toAgreementSettings(agent), tz),
  }
  // Match blanks loosely: "Client's Name", "Client’s name", "Buyer Name" and
  // "[[ client name ]]" are all the same blank. Anything that means the client's
  // name, address, email or phone is filled from the file, and only asked for when it's empty.
  const fromFile = (key: string): string | undefined => {
    const n = norm(key)
    for (const [k, v] of Object.entries(auto)) if (norm(k) === n) return v
    const alias = ALIASES[n]
    return alias ? auto[alias] : undefined
  }
  const given: Record<string, string> = {}
  for (const [k, v] of Object.entries(deal)) given[norm(k)] = String(v ?? "").trim()

  // Every blank gets a value: what the agent said for this client wins, then the file and
  // Settings (names, addresses, dates, the usual commission). A blank the file should fill but
  // can't, like an address not on file yet, is asked for like any other.
  const source = normalizeBlanks(String(tpl.body ?? ""))
  const valueFor = (key: string): string => given[norm(key)] || (fromFile(key) ?? "").trim() || ""
  const missing = parsePlaceholders(source).filter((p) => !valueFor(p.key)).map((p) => p.label)
  if (missing.length) return { state: "missing", title: tpl.title, templateId: tpl.id, missing }

  const body = cleanDoc(source.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => valueFor(inner.trim().toLowerCase()) || valueFor(inner)))
  const left = leftoverBlanks(body)
  if (left.length) return { state: "missing", title: tpl.title, templateId: tpl.id, missing: left }
  return { state: "ready", title: tpl.title, templateId: tpl.id, body, email: (client.email as string) || null }
}

// The agent signed and approved it: it starts the signing order (agent, broker, then client).
export async function deliverAgreement(
  db: SupabaseClient,
  agentId: string,
  replyTo: string | undefined,
  origin: string,
  clientId: string,
  title: string,
  body: string,
): Promise<StartResult> {
  return startSigning(db, { agentId, clientId, kind: "agreement", title, body, origin, replyTo })
}
