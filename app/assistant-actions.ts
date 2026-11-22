"use server"
import { assistantDisplayName } from "@/lib/assistant-name"
import { isAdminEmail } from "@/lib/admin"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { handleRequest, type ChatAnswer, type ChatTurn, type OfferDraft } from "@/lib/agent-chat"
import { deliverAgreement } from "@/lib/agreement-fill"
import { sendOffer } from "./clients/[id]/homes-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendInvite, toMeetKind } from "@/lib/meetings"

// The assistant chat, from any app page. ctxClientId is set when the agent is in a client's file.
export async function askMarvberry(history: ChatTurn[], ctxClientId: string | null): Promise<ChatAnswer> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { reply: "Your session ended. Sign in again." }
  // The Marvberry team sees the real reason behind a failure; agents see the calm line.
  const team = isAdminEmail(user.email)
  try {
    const { reason, ...answer } = await handleRequest(supabase, user.id, history.slice(-14), ctxClientId)
    if (reason && team) return { ...answer, reply: `${answer.reply}\n\nFor the Marvberry team: ${reason}` }
    return answer
  } catch (e) {
    console.error("[diana] request failed", e)
    const why = (e as Error)?.message ?? String(e)
    return { reply: `I couldn’t work on that just now. Try again in a moment. If this keeps happening, message us from Support.${team ? `\n\nFor the Marvberry team: ${why}` : ""}` }
  }
}

// What the agent named their assistant.
export async function assistantName(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return "Marvberry"
  const { data } = await supabase.from("agents").select("assistant_name").eq("id", user.id).maybeSingle()
  return assistantDisplayName(data?.assistant_name)
}

// The agent reviewed the agreement in the chat and tapped Send.
export async function sendAgreementFromChat(clientId: string, title: string, body: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !clientId || !body.trim()) return { ok: false, message: "Your session ended. Sign in again." }
  const h = await headers()
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`
  const r = await deliverAgreement(supabase, user.id, user.email ?? undefined, origin, clientId, title, body.slice(0, 60000))
  revalidatePath(`/clients/${clientId}`)
  if (r === "sent") return { ok: true, message: "Sent for signature." }
  if (r === "noemail") return { ok: true, message: "It’s on their page. Add their email so they get the link." }
  if (r === "mailfail") return { ok: true, message: "Saved to their page, but the email didn’t go out. Resend it from their file." }
  return { ok: false, message: "That didn’t send. Try again." }
}

// The agent reviewed the offer in the chat and tapped Send. Same path as the offer form.
export async function sendOfferFromChat(clientId: string, o: OfferDraft): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  let homeId = o.homeId
  if (!homeId) {
    const { data } = await supabase.from("homes").insert({ agent_id: user.id, client_id: clientId, address: o.address.slice(0, 200) }).select("id").single()
    if (!data) return { ok: false, message: "Couldn’t save the home. Try again." }
    homeId = data.id as string
  }
  const f = new FormData()
  f.set("homeId", homeId)
  f.set("agentName", o.agentName)
  f.set("agentBrokerage", o.agentBrokerage)
  f.set("agentEmail", o.agentEmail)
  f.set("agentPhone", o.agentPhone)
  f.set("amount", String(o.amount))
  if (o.deposit) f.set("deposit", String(o.deposit))
  f.set("financing", o.financing)
  for (const c of o.contingencies) f.append("contingency", c)
  f.set("closingOn", o.closingOn)
  f.set("goodDate", o.goodDate)
  f.set("goodTime", o.goodTime)
  f.set("message", o.message)
  for (const d of o.docIds) f.append("doc", d)
  f.set("pdfForm", o.formId)
  for (const [k, v] of Object.entries(o.formBlanks)) f.set(`pdf:${k}`, v)
  const r = await sendOffer(null, f)
  return { ok: r.ok, message: r.message ?? (r.ok ? "Offer sent." : "That didn’t send. Try again.") }
}

// The agent tapped Send on a drafted message: it goes into the client's thread, same as typing it there.
export async function sendFromChat(clientId: string, body: string): Promise<{ ok: boolean }> {
  const text = body.trim().slice(0, 4000)
  if (!clientId || !text) return { ok: false }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { error } = await supabase.from("messages").insert({ agent_id: user.id, client_id: clientId, sender: "agent", body: text })
  if (error) return { ok: false }
  revalidatePath(`/clients/${clientId}`)
  return { ok: true }
}

// The agent tapped Add on a showing card: it goes on the calendar, tied to the client.
export async function addShowingFromChat(clientId: string, place: string, date: string, start: string, end: string): Promise<{ ok: boolean }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) return { ok: false }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data: agent } = await supabase.from("agents").select("timezone").eq("id", user.id).maybeSingle()
  const tz = (agent?.timezone as string) || "America/New_York"
  const { error } = await supabase.from("events").insert({
    agent_id: user.id,
    client_id: clientId,
    kind: "showing",
    place: place.slice(0, 200),
    starts_at: fromZonedTime(`${date}T${start}:00`, tz).toISOString(),
    ends_at: fromZonedTime(`${date}T${end}:00`, tz).toISOString(),
  })
  if (error) return { ok: false }
  revalidatePath("/calendar")
  revalidatePath(`/clients/${clientId}`)
  return { ok: true }
}

// The agent approved a meeting invitation: hold the times, then send it to the
// client's suite and email.
export async function sendMeetingFromChat(o: {
  clientId: string
  startISOs: string[]
  minutes: number
  kind: string
  place: string
  message: string
}): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  const kind = toMeetKind(o.kind)
  if (!kind || !o.message.trim()) return { ok: false, message: "Add a short message, then send." }
  const r = await sendInvite(createAdminClient(), user.id, { ...o, kind })
  if (!r.ok) return r
  revalidatePath(`/clients/${o.clientId}`)
  return { ok: true, message: `Sent. I’m holding those times until ${r.holdUntil}, and I’ll let you know when ${r.first} picks.` }
}
