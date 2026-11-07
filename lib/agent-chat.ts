import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { formatInTimeZone } from "date-fns-tz"
import { askClaude } from "@/lib/ai"
import { draftAboutFor } from "@/lib/assistant"
import { daysUntil, longDate } from "@/lib/due"

// The Marvberry chat: the agent types what needs to happen, Marvberry works out
// what they mean and prepares it. Nothing reaches a client from here without the
// agent tapping Send or Add on the card that comes back.

export type ChatCard =
  | { type: "message"; clientId: string; name: string; body: string }
  | { type: "agreement"; clientId: string; name: string; ready: boolean }
  | { type: "showing"; clientId: string; name: string; place: string; date: string; start: string; end: string; label: string }
  | { type: "client"; clientId: string; name: string }
  | { type: "list"; items: { label: string; sub: string; href: string }[] }

export type ChatAnswer = { reply: string; card?: ChatCard; chips?: string[] }

const HELP_CHIPS = ["What’s waiting on me?", "Prepare an agreement", "Send a client a reminder", "Add a new client"]

type Client = { id: string; first_name: string; last_name: string }
type Intent = {
  intent: "add_client" | "prepare_agreement" | "message_client" | "schedule_showing" | "whats_waiting" | "help" | "unknown"
  client?: string
  name?: string
  email?: string
  phone?: string
  about?: string
  address?: string
  date?: string
  start?: string
  end?: string
}

const full = (c: Client) => `${c.first_name} ${c.last_name}`.trim()

function findClient(list: Client[], name: string | undefined): Client[] {
  const q = (name || "").toLowerCase().replace(/[’']s\b/g, "").trim()
  if (!q) return []
  const exact = list.filter((c) => full(c).toLowerCase() === q)
  if (exact.length) return exact
  return list.filter((c) => {
    const f = full(c).toLowerCase()
    return f.includes(q) || q.includes(c.first_name.toLowerCase()) || c.first_name.toLowerCase() === q.split(" ")[0]
  })
}

function parse(text: string | null): Intent | null {
  if (!text) return null
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Intent
  } catch {
    return null
  }
}

export async function handleRequest(db: SupabaseClient, agentId: string, text: string, ctxClientId: string | null): Promise<ChatAnswer> {
  const ask = text.trim().slice(0, 600)
  if (!ask) return { reply: "What can I take off your plate?", chips: HELP_CHIPS }

  const [{ data: agent }, { data: clientRows }, { count: templates }] = await Promise.all([
    db.from("agents").select("timezone").eq("id", agentId).maybeSingle(),
    db.from("clients").select("id, first_name, last_name").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(300),
    db.from("document_templates").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
  ])
  const tz = (agent?.timezone as string) || "America/New_York"
  const clients = (clientRows ?? []) as Client[]
  const ctx = ctxClientId ? clients.find((c) => c.id === ctxClientId) : undefined
  const today = formatInTimeZone(new Date(), tz, "EEEE, yyyy-MM-dd")

  const system = `You turn a real estate agent's request into one JSON object and nothing else.
Intents and their fields:
- add_client: name, email, phone (a new client to add)
- prepare_agreement: client
- message_client: client, about (what the message should say or do: a reminder, an update, a follow-up)
- schedule_showing: client, address, date (YYYY-MM-DD), start (HH:MM, 24-hour), end (HH:MM, 24-hour, only if they said it)
- whats_waiting: (what's due, who's waiting, what to do today)
- help: (what can you do)
- unknown: anything else
"client" is the client's name as the agent said it. Leave a field out if the agent didn't give it. Never guess an email, phone, date or time.
Today is ${today} (${tz}).${ctx ? ` The agent is looking at ${full(ctx)}'s file right now, so "her", "him", "them" or no name means ${full(ctx)}.` : ""}
Clients: ${clients.slice(0, 150).map(full).join(", ") || "none yet"}`
  const intent = parse(await askClaude(system, ask))
  if (!intent) return { reply: "I couldn’t work on that just now. Try again in a moment.", chips: HELP_CHIPS }

  // Requests about one client: work out who.
  const needsClient = ["prepare_agreement", "message_client", "schedule_showing"].includes(intent.intent)
  let client: Client | undefined
  if (needsClient) {
    const matches = intent.client ? findClient(clients, intent.client) : ctx ? [ctx] : []
    if (matches.length === 1) client = matches[0]
    else if (matches.length > 1)
      return { reply: `I found a few people named ${intent.client}. Which one?`, chips: matches.slice(0, 4).map((c) => `${ask} (${full(c)})`) }
    else if (intent.client)
      return { reply: `I couldn’t find ${intent.client} in your clients. Want me to add them?`, chips: [`Add ${intent.client} as a new client`] }
    else return { reply: "Who is this for?", chips: clients.slice(0, 4).map((c) => `${ask} for ${full(c)}`) }
  }

  switch (intent.intent) {
    case "add_client": {
      const parts = (intent.name || "").trim().replace(/\s+/g, " ").split(" ")
      const first = (parts.shift() || "").slice(0, 80)
      if (!first) return { reply: "Sure. What’s their name? You can add their email and phone too." }
      const email = (intent.email || "").trim()
      const { data, error } = await db
        .from("clients")
        .insert({
          agent_id: agentId,
          first_name: first,
          last_name: parts.join(" ").slice(0, 80),
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
          phone: (intent.phone || "").trim().slice(0, 40) || null,
        })
        .select("id")
        .single()
      if (error || !data) return { reply: "I couldn’t add them just now. Try again in a moment." }
      const name = `${first} ${parts.join(" ")}`.trim()
      return { reply: `${first} is all set. Their messages, documents and next steps now live in one place.`, card: { type: "client", clientId: data.id as string, name } }
    }

    case "prepare_agreement": {
      const c = client!
      if (!templates)
        return {
          reply: `I prepare agreements from your own buyer agreement, so they’re always in your words. Upload it from your dashboard, and our team will set it up, usually within one business day. Then ${c.first_name}’s will be ready for your review.`,
          card: { type: "agreement", clientId: c.id, name: full(c), ready: false },
        }
      return {
        reply: `${c.first_name}’s agreement is ready for your review. Check the details, add anything that’s missing, and send it when you’re happy.`,
        card: { type: "agreement", clientId: c.id, name: full(c), ready: true },
      }
    }

    case "message_client": {
      const c = client!
      const body = await draftAboutFor(db, agentId, c.id, intent.about || ask)
      if (!body) return { reply: "I couldn’t write that one just now. Try again in a moment." }
      return { reply: `Here’s a draft for ${c.first_name}, in your voice. Nothing goes out until you send it.`, card: { type: "message", clientId: c.id, name: full(c), body } }
    }

    case "schedule_showing": {
      const c = client!
      if (!intent.date || !intent.start || !/^\d{4}-\d{2}-\d{2}$/.test(intent.date) || !/^\d{2}:\d{2}$/.test(intent.start))
        return { reply: `What day and time is ${c.first_name}’s showing, and at which address?` }
      const [h, m] = intent.start.split(":").map(Number)
      const end = intent.end && /^\d{2}:\d{2}$/.test(intent.end) && intent.end > intent.start ? intent.end : `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      const label = `${formatInTimeZone(new Date(`${intent.date}T12:00:00Z`), "UTC", "EEEE, MMMM d")} · ${fmt(intent.start)}–${fmt(end)}`
      return {
        reply: `Here’s ${c.first_name}’s showing. Add it, and it goes on your calendar.`,
        card: { type: "showing", clientId: c.id, name: full(c), place: (intent.address || "").slice(0, 200), date: intent.date, start: intent.start, end, label },
      }
    }

    case "whats_waiting": {
      const { data: steps } = await db
        .from("steps")
        .select("title, due_on, client_id, clients(first_name, last_name)")
        .eq("done", false)
        .not("due_on", "is", null)
        .order("due_on", { ascending: true })
        .limit(40)
      const soon = ((steps ?? []) as unknown as { title: string; due_on: string; client_id: string; clients: { first_name: string; last_name: string } | null }[])
        .filter((s) => daysUntil(s.due_on, tz) <= 7)
        .slice(0, 6)
      if (!soon.length) return { reply: "Nothing’s due in the next week. You’re all caught up.", chips: HELP_CHIPS }
      return {
        reply: "Here’s what’s coming up this week.",
        card: {
          type: "list",
          items: soon.map((s) => {
            const d = daysUntil(s.due_on, tz)
            return {
              label: `${s.clients?.first_name ?? "Client"} · ${s.title}`,
              sub: d < 0 ? "Past due" : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `Due ${longDate(s.due_on)}`,
              href: `/clients/${s.client_id}`,
            }
          }),
        },
      }
    }

    case "help":
      return { reply: "I can add a client, prepare an agreement, draft a message in your voice, schedule a showing, and tell you what’s waiting on you.", chips: HELP_CHIPS }

    default:
      return { reply: "I can’t do that one yet. Here’s what I can help with right now.", chips: HELP_CHIPS }
  }
}

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ap = h >= 12 ? "PM" : "AM"
  const hh = h % 12 || 12
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`
}
