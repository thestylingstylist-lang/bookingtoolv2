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
import { runConfirmed } from "@/lib/diana-ops"
import { openConversation, saveConversation, endConversation, history, keptConversation, forget, forgetAll, type SavedLine } from "@/lib/diana-memory"

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
    // Keep the conversation, so it survives a refresh and can go to History.
    await saveConversation(supabase, user.id, [
      ...history.map((h) => ({ me: h.me, text: h.text })),
      { me: false, text: answer.reply },
    ]).catch(() => {})
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
  if (r !== "noemail" && r !== "mailfail" && isAdminEmail(user.email)) return { ok: false, message: `That didn’t send. Tap again in a moment.\n\nFor the Marvberry team: deliverAgreement returned "${r}".` }
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
  return withTeamLine(
    { ok: r.ok, message: r.message ?? (r.ok ? "Offer sent." : "That didn’t send. Tap again in a moment."), detail: r.ok ? undefined : `sendOffer: ${r.message ?? "no reason given"}` },
    isAdminEmail(user.email),
  )
}

// The agent tapped Send on a drafted message: it goes into the client's thread, same as typing it there.
export async function sendFromChat(clientId: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const text = body.trim().slice(0, 4000)
  if (!clientId || !text) return { ok: false }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { error } = await supabase.from("messages").insert({ agent_id: user.id, client_id: clientId, sender: "agent", body: text })
  if (error) {
    console.error("[sendFromChat]", error)
    return withTeamLine({ ok: false, message: "That didn’t send. Tap again in a moment.", detail: `messages insert: ${error.message}` }, isAdminEmail(user.email))
  }
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
  email?: string
}): Promise<{ ok: boolean; message: string; needsEmail?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  const kind = toMeetKind(o.kind)
  if (!kind || !o.message.trim()) return { ok: false, message: "Add a short message, then send." }
  const team = isAdminEmail(user.email)
  const admin = createAdminClient()
  const email = (o.email ?? "").trim().toLowerCase()
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, needsEmail: true, message: "That email doesn't look right. Check it and try again." }
    const { error } = await admin.from("clients").update({ email }).eq("id", o.clientId).eq("agent_id", user.id)
    if (error) return { ok: false, needsEmail: true, message: "That email didn't save. Try again in a moment." }
  }
  let r: Awaited<ReturnType<typeof sendInvite>>
  try {
    r = await sendInvite(admin, user.id, { ...o, kind })
  } catch (e) {
    console.error("[meetings] send failed", e)
    const why = (e as Error)?.message ?? String(e)
    return { ok: false, message: `That didn’t send. Try again in a moment.${team ? `\n\nFor the Marvberry team: ${why}` : ""}` }
  }
  if (!r.ok) return { ok: false, needsEmail: r.needsEmail, message: `${r.message}${team && r.detail ? `\n\nFor the Marvberry team: ${r.detail}` : ""}` }
  revalidatePath(`/clients/${o.clientId}`)
  return { ok: true, message: `Sent. I’m holding those times until ${r.holdUntil}, and I’ll let you know when ${r.first} picks.` }
}

// The agent tapped yes on one of Diana's approval cards.
const CONFIRMABLE = new Set([
  "send_document",
  "resend_document",
  "send_suite_link",
  "follow_up_offer",
  "support_message",
  "send_reminder",
  "delete_client",
  "delete_booking",
  "delete_note",
  "delete_step",
  "delete_collected",
  "delete_template",
  "remove_home",
  "delete_open_house",
  "delete_sale_offer",
  "delete_event",
])

export async function confirmOp(
  op: string,
  args: Record<string, string>,
  email?: string,
): Promise<{ ok: boolean; message: string; needsEmail?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  if (!CONFIRMABLE.has(op)) return { ok: false, message: "That isn't something I can do from here." }

  // Sends that go by email: make sure there's an address first, and take one
  // right here on the card if there isn't.
  const target = await emailTarget(supabase, op, args)
  if (target) {
    const given = (email ?? "").trim().toLowerCase()
    if (given) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(given)) return { ok: false, needsEmail: true, message: "That email doesn't look right. Check it, then tap Save and send." }
      const { error } = await supabase.from(target.table).update({ [target.column]: given }).eq("id", target.id)
      if (error) return withTeamLine({ ok: false, message: "That email didn't save. Tap again in a moment.", detail: `${target.table}.${target.column} update: ${error.message}` }, isAdminEmail(user.email))
    } else if (!target.current) {
      return { ok: false, needsEmail: true, message: `${target.who} doesn't have an email yet. Add it here and I'll send it.` }
    }
  }
  try {
    const r = await runConfirmed(op, args)
    return withTeamLine(r, isAdminEmail(user.email))
  } catch (e) {
    console.error("[confirmOp]", op, e)
    return withTeamLine({ ok: false, message: "That didn’t go through. Tap again in a moment.", detail: `${op} threw: ${(e as Error)?.message ?? e}` }, isAdminEmail(user.email))
  }
}

// ---------------------------------------------------------------- conversations

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function loadConversation(): Promise<{ lines: SavedLine[]; keep: boolean }> {
  const { supabase, user } = await me()
  if (!user) return { lines: [], keep: true }
  const cur = await openConversation(supabase, user.id).catch(() => null)
  const { data } = await supabase.from("agents").select("assistant_keep").eq("id", user.id).maybeSingle()
  return { lines: cur?.lines ?? [], keep: (data?.assistant_keep as boolean | undefined) ?? true }
}

export async function endChat(keep: boolean): Promise<{ ok: boolean }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false }
  await endConversation(supabase, user.id, keep).catch(() => {})
  return { ok: true }
}

export async function chatHistory(): Promise<{ id: string; title: string; when: string }[]> {
  const { supabase, user } = await me()
  if (!user) return []
  const { data: a } = await supabase.from("agents").select("timezone").eq("id", user.id).maybeSingle()
  const tz = (a?.timezone as string) || "America/New_York"
  const { formatInTimeZone } = await import("date-fns-tz")
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd")
  return (await history(supabase, user.id).catch(() => [])).map((c) => {
    const d = new Date(c.last_at)
    const day = formatInTimeZone(d, tz, "yyyy-MM-dd")
    const when = day === today ? `Today, ${formatInTimeZone(d, tz, "h:mm a")}` : Date.now() - d.getTime() < 6 * 86400000 ? formatInTimeZone(d, tz, "EEEE") : formatInTimeZone(d, tz, "MMM d")
    return { id: c.id, title: c.title || "Conversation", when }
  })
}

export async function chatFromHistory(id: string): Promise<{ title: string; lines: SavedLine[] } | null> {
  const { supabase, user } = await me()
  if (!user) return null
  const c = await keptConversation(supabase, user.id, id).catch(() => null)
  return c ? { title: c.title, lines: Array.isArray(c.lines) ? c.lines : [] } : null
}

// ---------------------------------------------------------------- settings

export async function saveKeepSetting(keep: boolean): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  const { error } = await supabase.from("agents").update({ assistant_keep: keep }).eq("id", user.id)
  revalidatePath("/settings")
  return error ? { ok: false, message: "That didn't save. Message us from Support, and we'll switch it on." } : { ok: true, message: "Saved." }
}

export async function deleteMemory(id: string): Promise<{ ok: boolean }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false }
  const ok = await forget(supabase, user.id, id)
  revalidatePath("/settings")
  return { ok }
}

export async function clearMemories(): Promise<{ ok: boolean }> {
  const { supabase, user } = await me()
  if (!user) return { ok: false }
  const ok = await forgetAll(supabase, user.id)
  revalidatePath("/settings")
  return { ok }
}

// The Marvberry team sees the technical reason under any failed card.
function withTeamLine(r: { ok: boolean; message: string; detail?: string }, team: boolean): { ok: boolean; message: string } {
  if (r.ok || !team || !r.detail) return { ok: r.ok, message: r.message }
  return { ok: false, message: `${r.message}\n\nFor the Marvberry team: ${r.detail}` }
}

// Where the email for a send lives: the client's, or the seller's agent's on the home.
async function emailTarget(
  db: Awaited<ReturnType<typeof createClient>>,
  op: string,
  args: Record<string, string>,
): Promise<{ table: "clients" | "homes"; column: string; id: string; current: string; who: string } | null> {
  if (op === "send_document" || op === "resend_document" || op === "send_suite_link" || op === "send_reminder") {
    let clientId = args.clientId
    if (op === "send_reminder") {
      const { data: s } = await db.from("steps").select("client_id").eq("id", args.stepId ?? "").maybeSingle()
      clientId = s?.client_id ?? ""
    }
    if (!clientId) return null
    const { data: c } = await db.from("clients").select("id, first_name, email").eq("id", clientId).maybeSingle()
    if (!c) return null
    return { table: "clients", column: "email", id: c.id, current: c.email ?? "", who: c.first_name || "This client" }
  }
  if (op === "follow_up_offer") {
    const { data: o } = await db.from("home_offers").select("home_id").eq("id", args.offerId ?? "").maybeSingle()
    if (!o?.home_id) return null
    const { data: h } = await db.from("homes").select("id, agent_name, agent_email").eq("id", o.home_id).maybeSingle()
    if (!h) return null
    return { table: "homes", column: "agent_email", id: h.id, current: h.agent_email ?? "", who: h.agent_name || "The seller's agent" }
  }
  return null
}
