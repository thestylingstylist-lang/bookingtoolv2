"use server"

import { revalidatePath } from "next/cache"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { handleRequest, type ChatAnswer } from "@/lib/agent-chat"

// The Marvberry chat, from any app page. ctxClientId is set when the agent is in a client's file.
export async function askMarvberry(text: string, ctxClientId: string | null): Promise<ChatAnswer> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { reply: "Please sign in again." }
  try {
    return await handleRequest(supabase, user.id, text, ctxClientId)
  } catch {
    return { reply: "I couldn’t work on that just now. Try again in a moment." }
  }
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
