"use server"

import { createClient } from "@/lib/supabase/server"
import { askClaude } from "@/lib/ai"
import { longDate, daysUntil, missingThing } from "@/lib/due"

// The voice every draft is held to. Calm, plain, and it always hands the
// client the next move instead of making them worry.
const VOICE = `You write short messages from a real estate agent to their client. You write AS the agent, in first person.

How it sounds:
- Calm and warm. State the fact plainly, then tell the client the one easy thing to do next.
- Never make the client anxious. No guilt, no pressure, no "urgent", no "ASAP", no "as soon as possible".
- Never use the words "need", "needs", "kill", or "just a quick reminder".
- Plain everyday words. Short sentences. It should read like a text from someone they trust.
- 2 to 4 sentences. No subject line. No bullet points. No exclamation marks unless the agent's own past messages use them.
- End with the agent's first name on its own line.
- If past messages from the agent are given, match their greeting, rhythm and word choice. Don't copy them.

Reply with the message only. Nothing before it, nothing after it.`

export async function draftReminder(stepId: string): Promise<{ text: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !stepId) return { text: null }

  const { data: step } = await supabase
    .from("steps")
    .select("id, title, due_on, phase, client_id")
    .eq("id", stepId)
    .maybeSingle()
  if (!step) return { text: null }

  const [{ data: client }, { data: agent }, { data: docs }, { data: past }] = await Promise.all([
    supabase.from("clients").select("first_name").eq("id", step.client_id).maybeSingle(),
    supabase.from("agents").select("full_name, timezone").eq("id", user.id).maybeSingle(),
    supabase.from("collected_docs").select("title, received").eq("client_id", step.client_id),
    supabase
      .from("messages")
      .select("body")
      .eq("agent_id", user.id)
      .eq("sender", "agent")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const tz = agent?.timezone || "America/New_York"
  const agentFirst = (agent?.full_name || "").trim().split(/\s+/)[0] || ""
  const missing = (docs ?? []).filter((d) => !d.received).map((d) => d.title)
  const late = step.due_on ? daysUntil(step.due_on, tz) < 0 : false

  const facts = [
    `Client first name: ${client?.first_name || "(unknown, skip the name)"}`,
    `Agent first name: ${agentFirst || "(unknown, skip the sign-off)"}`,
    `What the client still owes: ${missingThing(step.title)}`,
    step.due_on ? `Date it was due: ${longDate(step.due_on)}${late ? " (that date has passed)" : ""}` : "",
    step.phase ? `Stage of the deal: ${step.phase}` : "",
    /document/i.test(step.title) && missing.length ? `Documents still missing: ${missing.join(", ")}` : "",
    "The client sends it from their own page in the link under this message. They don't log in.",
  ]
    .filter(Boolean)
    .join("\n")

  const examples = (past ?? [])
    .map((m) => (m.body || "").trim())
    .filter((b) => b.length > 20)
    .slice(0, 6)

  const prompt = `${facts}

${examples.length ? `Messages this agent has sent before, for their voice:\n${examples.map((e) => `---\n${e}`).join("\n")}\n---\n\n` : ""}Write the reminder.`

  return { text: await askClaude(VOICE, prompt) }
}
