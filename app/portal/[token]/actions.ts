"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyAgent } from "@/lib/notify"
import { tickStep } from "@/lib/auto-steps"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The client replies from their portal. The token in the link is their key.
export async function clientSendMessage(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!UUID_RE.test(token)) redirect("/")
  if (!body) redirect(`/portal/${token}`)

  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("id, agent_id, first_name, last_name")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) redirect("/")

  const { error } = await admin.from("messages").insert({
    agent_id: client.agent_id,
    client_id: client.id,
    sender: "client",
    body: body.slice(0, 4000),
  })
  if (!error) {
    const first = ((client.first_name as string | null) || (client.last_name as string | null) || "Your client").trim()
    const line = body.replace(/\s+/g, " ")
    const quote = line.length > 90 ? `${line.slice(0, 88).trimEnd()}…` : line
    await notifyAgent(admin, client.agent_id as string, "messages", {
      line: `${first} wrote to you`,
      body: `${first} wrote to you: “${quote}”`,
      url: `/clients/${client.id}`,
    })
  }
  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${client.id}`)
  redirect(`/portal/${token}${error ? "?error=msg" : ""}#messages`)
}

export type TimesResult = { ok: boolean; message: string }
const PARTS: Record<string, string> = { morning: "morning", afternoon: "afternoon", evening: "evening" }

// The client picks when they're free to see homes, right from their next step.
// The agent gets the times in the conversation and a notification; the step is done.
export async function saveShowingTimes(_prev: TimesResult | null, formData: FormData): Promise<TimesResult> {
  const token = String(formData.get("token") ?? "")
  if (!UUID_RE.test(token)) return { ok: false, message: "This link isn't working. Ask your agent for a fresh one." }
  const picks = formData
    .getAll("t")
    .map((v) => String(v))
    .filter((v) => /^\d{4}-\d{2}-\d{2}\|(morning|afternoon|evening)$/.test(v))
    .slice(0, 40)
  const note = String(formData.get("note") ?? "").trim().slice(0, 500)
  if (!picks.length && !note) return { ok: false, message: "Pick at least one time that works for you." }

  const admin = createAdminClient()
  const { data: client } = await admin.from("clients").select("id, agent_id, first_name").eq("portal_token", token).maybeSingle()
  if (!client) return { ok: false, message: "This link isn't working. Ask your agent for a fresh one." }
  const { data: agent } = await admin.from("agents").select("timezone").eq("id", client.agent_id).maybeSingle()
  const tz = (agent?.timezone as string) || "America/New_York"

  const day = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
  const lines = picks.map((p) => {
    const [d, part] = p.split("|")
    return `${day.format(new Date(`${d}T12:00:00Z`))}, ${PARTS[part]}`
  })
  // Saved apart, so the step and message still go through before suite-homes.sql has run.
  await admin
    .from("clients")
    .update({ showing_times: { picks, note, tz }, showing_times_at: new Date().toISOString() })
    .eq("id", client.id)
    .then(() => null, () => null)
  const body = [`When I'm free to see homes:`, ...lines.map((l) => `• ${l}`), note ? `\n${note}` : ""].filter(Boolean).join("\n")
  const { error } = await admin.from("messages").insert({ agent_id: client.agent_id, client_id: client.id, sender: "client", body })
  if (error) return { ok: false, message: "That didn't send. Please try again." }
  await tickStep(admin, client.id as string, "Get their availability")
  const first = ((client.first_name as string | null) || "Your client").trim()
  await notifyAgent(admin, client.agent_id as string, "messages", {
    line: `${first} shared when they're free to see homes`,
    body: `${first} shared when they're free: ${lines.slice(0, 3).join("; ")}${lines.length > 3 ? "…" : ""}`,
    url: `/clients/${client.id}`,
  })
  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${client.id}`)
  return { ok: true, message: "Sent." }
}
