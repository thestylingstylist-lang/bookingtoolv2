import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { askClaude } from "@/lib/ai"
import { longDate, daysUntil, missingThing } from "@/lib/due"
import { formatSlot } from "@/lib/slots"
import { aiPrefsFor } from "@/lib/ai-prefs"

// Marvberry Assistant: drafts the realtor's client messages in her own voice.
// Who has it: a row in assistant_plans (only the team can add one).
// Her choices, on the agent row, each tolerant of the column not existing yet:
//   assistant_auto  — false = she approves every message (default),
//                     true = reminders go out on their own
//   assistant_voice — a few messages she's written, so drafts sound like her

export type AssistantSettings = { unlocked: boolean; auto: boolean; voice: string }

export async function assistantFor(db: SupabaseClient, agentId: string): Promise<AssistantSettings> {
  const [{ data: plan, error: planErr }, { data: prefs }] = await Promise.all([
    db.from("assistant_plans").select("agent_id").eq("agent_id", agentId).maybeSingle(),
    db.from("agents").select("assistant_auto, assistant_voice").eq("id", agentId).maybeSingle(),
  ])
  const unlocked = !planErr && !!plan
  const row = (prefs ?? {}) as { assistant_auto?: boolean; assistant_voice?: string }
  return { unlocked, auto: unlocked && !!row.assistant_auto, voice: row.assistant_voice ?? "" }
}

// The voice every draft is held to. Calm, plain, and it always hands the
// client the next move instead of making them worry.
const RULES = `You write short messages from a real estate agent to their client. You write AS the agent, in first person. The client must never be able to tell anyone else wrote it.

How it sounds:
- Calm and warm. State the fact plainly, then tell the client the one easy thing to do next.
- Never make the client anxious. No guilt, no pressure, no "urgent", no "ASAP", no "as soon as possible".
- Never use the words "need", "needs", "kill", or "just a quick reminder".
- Plain everyday words. Short sentences. It should read like a text from someone they trust.
- Full, clear times and dates: "10 in the morning", "Friday the 3rd". Never a bare day name that could be read two ways.
- Say the one clear thing. No hedging tails like "if you want" or "but you're welcome to".
- Never promise a timeline the agent doesn't control (lender, lawyer, inspector, the other agent). Say what the agent will do: "I'll let you know the moment I have it."
- Stay in the agent's lane: showings, offers, the contract timeline, next steps in the deal. Never weigh in on the loan or legal questions; point those to their lender or lawyer.
- 2 to 4 sentences. No subject line. No bullet points. No exclamation marks unless the agent's own past messages use them.
- End with the agent's first name on its own line.
- If messages the agent wrote are given, match their greeting, rhythm and word choice. Don't copy them.

Reply with the message only. Nothing before it, nothing after it.`

async function voiceExamples(db: SupabaseClient, agentId: string, voice: string) {
  const { data: past } = await db
    .from("messages")
    .select("body")
    .eq("agent_id", agentId)
    .eq("sender", "agent")
    .order("created_at", { ascending: false })
    .limit(12)
  const fromThread = (past ?? []).map((m) => ((m.body as string) || "").trim()).filter((b) => b.length > 20)
  const written = voice
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 20)
  return [...written, ...fromThread].slice(0, 8)
}

function withVoice(facts: string, examples: string[], ask: string) {
  return `${facts}

${examples.length ? `Messages this agent has written, for their voice:\n${examples.map((e) => `---\n${e}`).join("\n")}\n---\n\n` : ""}${ask}`
}

// A reminder for a step the client owes. Null when the assistant can't write
// (no key, any error) so the caller keeps the plain draft.
export async function draftReminderFor(db: SupabaseClient, agentId: string, stepId: string): Promise<string | null> {
  const { data: step } = await db
    .from("steps")
    .select("id, title, due_on, phase, client_id, agent_id")
    .eq("id", stepId)
    .maybeSingle()
  if (!step || step.agent_id !== agentId) return null

  const [{ data: client }, { data: agent }, { data: docs }, settings] = await Promise.all([
    db.from("clients").select("first_name").eq("id", step.client_id).maybeSingle(),
    db.from("agents").select("full_name, timezone").eq("id", agentId).maybeSingle(),
    db.from("collected_docs").select("title, received").eq("client_id", step.client_id),
    assistantFor(db, agentId),
  ])
  if (!settings.unlocked) return null
  if (!(await aiPrefsFor(db, agentId)).reminders) return null

  const tz = agent?.timezone || "America/New_York"
  const agentFirst = ((agent?.full_name as string) || "").trim().split(/\s+/)[0] || ""
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

  const examples = await voiceExamples(db, agentId, settings.voice)
  return askClaude(RULES, withVoice(facts, examples, "Write the reminder."))
}

// A reply to the client's latest messages in the thread.
export async function draftReplyFor(db: SupabaseClient, agentId: string, clientId: string): Promise<string | null> {
  const settings = await assistantFor(db, agentId)
  if (!settings.unlocked) return null
  if (!(await aiPrefsFor(db, agentId)).replies) return null

  const [{ data: client }, { data: agent }, { data: thread }, { data: steps }] = await Promise.all([
    db.from("clients").select("first_name, agent_id, phase").eq("id", clientId).maybeSingle(),
    db.from("agents").select("full_name, timezone").eq("id", agentId).maybeSingle(),
    db
      .from("messages")
      .select("sender, body, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(12),
    db.from("steps").select("title, owner, done, due_on").eq("client_id", clientId).eq("done", false).limit(10),
  ])
  const { data: events } = await db
    .from("events")
    .select("kind, place, starts_at")
    .eq("client_id", clientId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5)
  if (!client || client.agent_id !== agentId) return null
  const recent = (thread ?? []).slice().reverse()
  if (!recent.length || recent[recent.length - 1].sender !== "client") return null

  const agentFirst = ((agent?.full_name as string) || "").trim().split(/\s+/)[0] || ""
  const open = (steps ?? [])
    .map((s) => `${s.title}${s.due_on ? ` (due ${longDate(s.due_on as string)})` : ""}`)
    .join("; ")

  const facts = [
    `Client first name: ${client.first_name || "(unknown, skip the name)"}`,
    `Agent first name: ${agentFirst || "(unknown, skip the sign-off)"}`,
    client.phase ? `Stage of the deal: ${client.phase}` : "",
    open ? `Open steps in this deal: ${open}` : "",
    (events ?? []).length
      ? `On the calendar with this client: ${(events ?? [])
          .map((e) => `${String(e.kind).replace("_", " ")} ${formatSlot(e.starts_at as string, (agent?.timezone as string) || "America/New_York")}${e.place ? ` at ${e.place}` : ""}`)
          .join("; ")}`
      : "Nothing is on the calendar with this client yet.",
    "Only use times, places and facts given here. If the client asks something not covered (a price, a time, an address), don't make it up. Say you'll confirm it and get back to them.",
    `The conversation so far, oldest first:\n${recent
      .map((m) => `${m.sender === "client" ? "Client" : "Agent"}: ${((m.body as string) || "").trim()}`)
      .join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n")

  const examples = await voiceExamples(db, agentId, settings.voice)
  return askClaude(RULES, withVoice(facts, examples, "Write the agent's reply to the client's latest message."))
}
