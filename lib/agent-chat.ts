import "server-only"
import { assistantDisplayName } from "@/lib/assistant-name"
import { loadMeetAgent, availability, openTimes, toMeetKind } from "@/lib/meetings"

import type { SupabaseClient } from "@supabase/supabase-js"
import { formatInTimeZone } from "date-fns-tz"
import { runAgent, type AgentTool, type AgentTurn } from "@/lib/ai"
import { draftAboutFor } from "@/lib/assistant"
import { daysUntil, longDate } from "@/lib/due"
import { prepareAgreement } from "@/lib/agreement-fill"
import { customBlanks, type PdfField } from "@/lib/pdf-fields"

// The assistant in the chat. Claude gets the tools below and works step by step
// (look up the client, check the file, fill the paperwork, write the note) until
// the job is ready. Anything that reaches a client or another agent comes back
// as a card the agent sends with one tap.

export type ChatCard =
  | { type: "message"; clientId: string; name: string; body: string }
  | { type: "agreement"; clientId: string; name: string; title: string; body: string; email: string | null }
  | { type: "agreement_setup" }
  | { type: "showing"; clientId: string; name: string; place: string; date: string; start: string; end: string; label: string }
  | { type: "client"; clientId: string; name: string; sub: string }
  | { type: "offer"; clientId: string; name: string; offer: OfferDraft; rows: { k: string; v: string }[]; attach: string[] }
  | { type: "list"; items: { label: string; sub: string; href: string }[] }
  | {
      type: "times"
      clientId: string
      name: string
      kind: "phone" | "in_person" | "video"
      place: string
      minutes: number
      message: string
      options: { startISO: string; label: string }[]
    }

export type OfferDraft = {
  homeId: string | null
  address: string
  amount: number
  deposit: number | null
  financing: string
  contingencies: string[]
  closingOn: string
  goodDate: string
  goodTime: string
  agentName: string
  agentBrokerage: string
  agentEmail: string
  agentPhone: string
  message: string
  docIds: string[]
  formId: string
  formBlanks: Record<string, string>
}

export type ChatAnswer = { reply: string; cards?: ChatCard[]; chips?: string[]; reason?: string }
export type ChatTurn = { me: boolean; text: string }

const HELP_CHIPS = ["What’s waiting on me?", "Prepare an agreement", "Prepare an offer", "Send a client an update"]
const FINANCING = ["Conventional", "FHA", "VA", "Cash"]
const CONTINGENCIES = ["Inspection", "Appraisal", "Mortgage", "Home sale"]
const MONTHLY_TASKS = 600

type Client = { id: string; first_name: string; last_name: string; phase: string | null }
const full = (c: { first_name: string; last_name: string }) => `${c.first_name} ${c.last_name}`.trim()
const str = (v: unknown, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "")
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}
const usd = (n: number | null) => (n ? `$${n.toLocaleString("en-US")}` : "")

const TOOLS: AgentTool[] = [
  {
    name: "find_client",
    description: "Find a client by name. Returns matches with their id and stage. Use this before anything about a specific client.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "client_file",
    description:
      "Everything on one client's file: contact details, stage, agreement status, homes they're looking at, offers, documents collected, open steps, and the latest messages. Check this before acting for a client.",
    input_schema: { type: "object", properties: { client_id: { type: "string" } }, required: ["client_id"] },
  },
  {
    name: "whats_waiting",
    description:
      "Steps due in the next week across all clients, and offers still waiting on an answer. Set show_list to true only when the agent asks to see the list; then the agent sees it as cards and you don't repeat it in words.",
    input_schema: {
      type: "object",
      properties: { show_list: { type: "boolean", description: "True only when the agent asked to see the list." } },
    },
  },
  {
    name: "add_client",
    description: "Add a new client. Only when the agent asked to add someone.",
    input_schema: {
      type: "object",
      properties: { first_name: { type: "string" }, last_name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } },
      required: ["first_name"],
    },
  },
  {
    name: "prepare_agreement",
    description:
      "Prepare the client's buyer agreement from the agent's own template. Checks first whether one is already signed or sent. If the template has blanks only the agent knows, it returns them: ask the agent, then call again with blanks filled. When ready, the agent gets it to review and send.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        blanks: { type: "object", description: "Blank label to value, for blanks the agent gave you.", additionalProperties: { type: "string" } },
      },
      required: ["client_id"],
    },
  },
  {
    name: "draft_message",
    description: "Write a message to a client in the agent's voice: an update, a reminder, a follow-up, an answer. The agent reviews and sends it.",
    input_schema: {
      type: "object",
      properties: { client_id: { type: "string" }, about: { type: "string", description: "What the message should say, with every fact it needs." } },
      required: ["client_id", "about"],
    },
  },
  {
    name: "schedule_showing",
    description: "Put a showing on the agent's calendar for a client. The agent taps Add.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        address: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        start: { type: "string", description: "HH:MM, 24-hour" },
        end: { type: "string", description: "HH:MM, 24-hour, only if the agent said it" },
      },
      required: ["client_id", "date", "start"],
    },
  },
  {
    name: "prepare_offer",
    description:
      "Prepare an offer on a home for a client: the terms, the agent's own offer form filled in, the client's documents attached, and the note to the seller's agent. Needs the address, price and the listing agent's email (check client_file for the home first; it may already have the listing agent). Returns what's missing, or the offer ready for the agent to review and send.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        address: { type: "string" },
        amount: { type: "number" },
        deposit: { type: "number", description: "Earnest money" },
        financing: { type: "string", enum: FINANCING },
        contingencies: { type: "array", items: { type: "string", enum: CONTINGENCIES } },
        closing_date: { type: "string", description: "YYYY-MM-DD" },
        good_until_date: { type: "string", description: "YYYY-MM-DD" },
        good_until_time: { type: "string", description: "HH:MM, 24-hour" },
        listing_agent_name: { type: "string" },
        listing_agent_email: { type: "string" },
        listing_agent_brokerage: { type: "string" },
        note: { type: "string", description: "A short, warm note to the seller's agent, in the agent's voice." },
        form_blanks: { type: "object", description: "Values for the offer form's own blanks, by label.", additionalProperties: { type: "string" } },
      },
      required: ["client_id", "address", "amount"],
    },
  },
  {
    name: "check_calendar",
    description:
      "The agent's own calendar: working hours, what's booked (showings, closings, open houses, consultations, meetings, personal time, times held for clients) and what's free, day by day. Use for questions about availability or the agent's schedule.",
    input_schema: {
      type: "object",
      properties: {
        from_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
        to_date: { type: "string", description: "YYYY-MM-DD. Defaults to a week from the start." },
      },
    },
  },
  {
    name: "suggest_meeting_times",
    description:
      "Find open times on the agent's calendar for a meeting with a client, and show them to the agent as a card to pick from. Only once you know how they'll meet (and where, if in person). The agent picks the times, sees your message with the times as buttons, and sends it to the client's suite and email. Nothing goes out without the agent.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        kind: { type: "string", enum: ["phone", "in_person", "video"] },
        place: { type: "string", description: "Where, for in person. Only what the agent said." },
        minutes: { type: "number", description: "How long the meeting is." },
        from_date: { type: "string", description: "YYYY-MM-DD, if the agent named a day or week." },
        to_date: { type: "string", description: "YYYY-MM-DD" },
        message: {
          type: "string",
          description:
            "A short invitation to the client, in the agent's voice and signed with the agent's first name. Don't list the times; they appear as buttons under it.",
        },
      },
      required: ["client_id", "kind", "minutes", "message"],
    },
  },
]

export async function handleRequest(
  db: SupabaseClient,
  agentId: string,
  history: ChatTurn[],
  ctxClientId: string | null,
): Promise<ChatAnswer> {
  const turns = history.filter((t) => t.text.trim()).slice(-14)
  const last = turns[turns.length - 1]
  if (!last || !last.me) return { reply: "What can I take off your plate?", chips: HELP_CHIPS }

  const [{ data: agent }, { data: clientRows }, { count: used }] = await Promise.all([
    db.from("agents").select("full_name, business_name, timezone, assistant_name").eq("id", agentId).maybeSingle(),
    db.from("clients").select("id, first_name, last_name, phase").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(400),
    db
      .from("ai_drafts")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .gte("created_at", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
  ])
  if ((used ?? 0) >= MONTHLY_TASKS) return { reply: "You’ve used this month’s requests. They reset on the 1st." }

  const tz = (agent?.timezone as string) || "America/New_York"
  const me = assistantDisplayName(agent?.assistant_name)
  const agentName = ((agent?.full_name as string) || "").trim()
  const clients = (clientRows ?? []) as Client[]
  const ctx = ctxClientId ? clients.find((c) => c.id === ctxClientId) : undefined
  const cards: ChatCard[] = []
  const nameOf = (id: string) => {
    const c = clients.find((x) => x.id === id)
    return c ? full(c) : ""
  }

  // The agent's usual meeting lengths, for Diana's suggestions.
  const meetAgent = await loadMeetAgent(db, agentId).catch(() => null)
  const meetLen = { call: meetAgent?.call_minutes ?? 30, inperson: meetAgent?.inperson_minutes ?? 60 }

  const system = `You are ${me}, the real estate assistant for ${agentName || "this agent"}${agent?.business_name ? ` at ${agent.business_name}` : ""}. You work inside Marvberry.

You know how a deal runs from first booking to closing: consult, buyer agreement, pre-approval, showings, offer, inspection, appraisal, mortgage commitment, final walk-through, closing. You know the paperwork and the timing, and you keep the deal moving.

Your role. You are the office. You're always here; the agent is usually out in the field. You always know what's happening, what's next and what matters most, and you've already prioritised it. Keep that awareness to yourself until it's useful.

You're great with people. Read the room and match what the agent is ready for:
- Small talk gets small talk. Don't bring up work.
- When the agent turns to work, lead gently. Show you've already thought ahead, share the one thing that matters most in a sentence or two, then check in before going further.
  Example (the names are only an illustration; use the real file): "Oh good, I was just looking at your week too. Priya's offer is the one I'd start with, it's still waiting on an answer. Want me to walk you through it, or see everything first?"
- Give details one client at a time, as the agent asks.
- Never show the step cards and the same list in your words together. Only show cards when the agent asks to see the list.

When the agent is just saying hello or chatting, be a friend: greet them by first name and ask how they are or how their day is going. Don't look anything up, don't mention work, clients or deadlines, and don't offer help. If they greet you again, answer warmly again, just as briefly. Only use your tools and look at their files when they ask about work.

How you work, when the agent asks for something:
- Do the work yourself, step by step, with your tools. Look the client up, check their file, then prepare the thing. Don't ask the agent for anything you can find in the file.
- Ask only for what you truly can't know (a price, a seller's agent's email, a blank only the agent can fill). Ask for all of it at once, in one short question.
- Anything that goes to a client or another agent comes back to ${agentName.split(" ")[0] || "the agent"} as a card to send with one tap. Never say something was sent. Say it's ready.
- Never invent a price, date, time, address, email or term. If it isn't in the request or the file, ask.
- You don't give legal, tax or loan advice. If asked, say that's one for their attorney or lender, and offer to draft the question to them.
- After you finish a task, say in one or two short sentences what's ready and what you'd do next for this deal, if there's a clear next step.

How you talk: warm, plain, short. Spoken words, like a great assistant leaning into the office. No lists unless there are several items. Say "real estate agent", never "realtor". Never use the word "need" when writing to clients. Say "attorney", never "lawyer", and "seller's agent", never "listing agent".

How you carry yourself. These are principles, not scripts.
- You're an executive-level assistant. Never narrate your process ("I've checked your calendar", "Kelly isn't in your files yet"). Simply take care of it and say what you'll do.
- Never repeat what you already said earlier in the conversation.
- Respond to the human moment first. When the agent shares news, like a new potential client, acknowledge it warmly before getting practical.
- Frame anything missing as an offer, not a requirement. Avoid "I'd need to" and "I need".
- One question at a time, and never re-ask something that's still waiting on an answer.
- When the agent shares news without asking for anything, first respond to it the way a caring person would, then ask one gentle, serving question about how you can help. Don't assume the next step or offer a plan unprompted. Your questions should feel like natural conversation that leads somewhere, not a checklist.

Arranging meetings. Principles, not scripts; any example is about tone, never a line to repeat.
- You can see the agent's whole Marvberry calendar with check_calendar. When asked about availability, answer briefly from it, in plain sentences.
- To arrange a meeting, only ask for what you don't already know, one simple question at a time. If they haven't said how, first ask whether they'd like to meet in person or over the phone. Only if it's in person, ask where: at the property or somewhere else. Never suggest a place yourself. If they already said "phone", go straight to times.
- Video calls only come up if the agent asks for one. They use the meeting link saved in Settings; if there isn't one, ask for it.
- Suggest a sensible length and invite a change in the same breath, rather than asking a separate question. Usually ${meetLen.call} minutes for a call and ${meetLen.inperson} for in person, unless the agent said otherwise. If they change it, use the new length for that meeting.
- Then use suggest_meeting_times. Write the invitation in the agent's voice. The agent picks the times and approves the message; nothing goes out without them.
- Offered times are held on the calendar while the client chooses. If the client doesn't answer in 48 hours, or every time passes, the holds are released and the agent hears from you.

Write plain text only. No markdown: no asterisks, no pound signs, no bullet symbols. If there are several items, put each on its own line.

Never mention a client, document or event that isn't in the agent's real files. Use only what you find there.

Today is ${formatInTimeZone(new Date(), tz, "EEEE, MMMM d, yyyy (yyyy-MM-dd)")}, and it is ${formatInTimeZone(new Date(), tz, "h:mm a")} for the agent, time zone ${tz}.${ctx ? `\nThe agent has ${full(ctx)}'s file open (client id ${ctx.id}). "Her", "him", "them" or no name means ${full(ctx)}.` : ""}`

  async function run(name: string, input: Record<string, unknown>): Promise<string> {
    const clientId = str(input.client_id, 60)
    if (["client_file", "prepare_agreement", "draft_message", "schedule_showing", "prepare_offer", "suggest_meeting_times"].includes(name) && !clients.some((c) => c.id === clientId))
      return "No client with that id. Use find_client first."

    switch (name) {
      case "find_client": {
        const q = str(input.name).toLowerCase().replace(/[’']s\b/g, "")
        const hits = clients.filter((c) => {
          const f = full(c).toLowerCase()
          return q && (f.includes(q) || q.includes(c.first_name.toLowerCase()) || c.first_name.toLowerCase() === q.split(" ")[0])
        })
        if (!hits.length) return `No client matches "${str(input.name)}". Clients: ${clients.slice(0, 60).map(full).join(", ") || "none yet"}.`
        return JSON.stringify(hits.slice(0, 6).map((c) => ({ id: c.id, name: full(c), stage: c.phase ?? "" })))
      }

      case "client_file":
        return clientFile(db, clientId, tz)

      case "whats_waiting": {
        const [{ data: steps }, { data: offers }] = await Promise.all([
          db
            .from("steps")
            .select("title, due_on, owner, client_id, clients(first_name, last_name)")
            .eq("done", false)
            .not("due_on", "is", null)
            .order("due_on", { ascending: true })
            .limit(40),
          db.from("home_offers").select("amount, created_at, client_id, homes(address)").eq("status", "sent").order("created_at").limit(10),
        ])
        const soon = ((steps ?? []) as unknown as { title: string; due_on: string; owner: string; client_id: string; clients: { first_name: string; last_name: string } | null }[]).filter(
          (s) => daysUntil(s.due_on, tz) <= 7,
        )
        const items = soon.slice(0, 6).map((s) => {
          const d = daysUntil(s.due_on, tz)
          return {
            label: `${s.clients?.first_name ?? "Client"} · ${s.title}`,
            sub: d < 0 ? "Past due" : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `Due ${longDate(s.due_on)}`,
            href: `/clients/${s.client_id}`,
          }
        })
        const showList = input.show_list === true
        if (showList && items.length) cards.push({ type: "list", items })
        const waiting = ((offers ?? []) as unknown as { amount: number; created_at: string; client_id: string; homes: { address: string } | null }[]).map(
          (o) => `${nameOf(o.client_id)}: ${usd(o.amount)} on ${o.homes?.address ?? "a home"}, sent ${longDate(o.created_at.slice(0, 10))}`,
        )
        return JSON.stringify({
          due_this_week: soon.map((s) => `${s.clients ? full(s.clients) : "Client"}: ${s.title} (${s.owner === "client" ? "client owes it" : "agent"}), due ${s.due_on}`),
          offers_waiting_on_an_answer: waiting,
          note:
            showList && items.length
              ? "The agent sees the due list as cards. Don't repeat it in words; add at most one sentence."
              : "This is for your awareness. Share only the one thing that matters most, then check in.",
        })
      }

      case "add_client": {
        const first = str(input.first_name, 80)
        if (!first) return "Ask for their name."
        const email = str(input.email, 200)
        const { data, error } = await db
          .from("clients")
          .insert({
            agent_id: agentId,
            first_name: first,
            last_name: str(input.last_name, 80),
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
            phone: str(input.phone, 40) || null,
          })
          .select("id")
          .single()
        if (error || !data) return "Couldn't add them."
        const nm = `${first} ${str(input.last_name, 80)}`.trim()
        clients.unshift({ id: data.id as string, first_name: first, last_name: str(input.last_name, 80), phase: null })
        cards.push({ type: "client", clientId: data.id as string, name: nm, sub: "Client added" })
        return `Added. Client id ${data.id}.`
      }

      case "prepare_agreement": {
        const blanks = (input.blanks && typeof input.blanks === "object" ? input.blanks : {}) as Record<string, string>
        const r = await prepareAgreement(db, agentId, clientId, blanks)
        if (r.state === "no_template") {
          cards.push({ type: "agreement_setup" })
          return "The agent hasn't uploaded their buyer agreement yet. Agreements are built from their own wording. Tell them to upload it (card shown), and the team sets it up within one business day."
        }
        if (r.state === "signed") return `Already signed: "${r.title}", signed ${longDate(r.signedAt.slice(0, 10))}. Nothing to send.`
        if (r.state === "sent") return `Already sent on ${longDate(r.sentAt.slice(0, 10))} and waiting for the client's signature. Offer to draft a friendly reminder instead.`
        if (r.state === "missing") return `The template "${r.title}" has blanks only the agent knows: ${r.missing.map((m) => `"${m}"`).join(", ")}. Ask the agent for them, then call again with blanks keyed by those exact labels. The client's name, address, email and phone come from the file automatically; never ask for them.`
        cards.push({ type: "agreement", clientId, name: nameOf(clientId), title: r.title, body: r.body, email: r.email })
        return `Ready. The agent sees the full agreement to review and send.${r.email ? "" : " The client has no email on file, so it will land on their page only. Mention it."}`
      }

      case "check_calendar": {
        const a = await loadMeetAgent(db, agentId)
        if (!a) return "The calendar isn't available right now."
        const from = /^\d{4}-\d{2}-\d{2}$/.test(str(input.from_date, 10)) ? str(input.from_date, 10) : undefined
        const to = /^\d{4}-\d{2}-\d{2}$/.test(str(input.to_date, 10)) ? str(input.to_date, 10) : undefined
        return JSON.stringify({ days: await availability(db, a, from, to), note: "Answer in a few plain sentences. No lists unless asked." })
      }

      case "suggest_meeting_times": {
        const a = await loadMeetAgent(db, agentId)
        if (!a) return "The calendar isn't available right now."
        const kind = toMeetKind(input.kind)
        if (!kind) return "Ask whether they'd like to meet in person or over the phone."
        const place = str(input.place, 200)
        if (kind === "in_person" && !place) return "Ask where they'd like to meet: at the property or somewhere else."
        if (kind === "video" && !a.meeting_link) return "There's no video meeting link in Settings. Ask the agent for one, or to add it in Settings."
        const minutes = Math.min(Math.max(Math.round(Number(input.minutes)) || (kind === "in_person" ? a.inperson_minutes : a.call_minutes), 10), 240)
        const from = /^\d{4}-\d{2}-\d{2}$/.test(str(input.from_date, 10)) ? str(input.from_date, 10) : undefined
        const to = /^\d{4}-\d{2}-\d{2}$/.test(str(input.to_date, 10)) ? str(input.to_date, 10) : undefined
        const found = await openTimes(db, a, minutes, from, to)
        if (!found.length) return "No open times of that length in that window. Say so and offer to look at another week or a shorter meeting."
        // Three good options, on different days where possible.
        const byDay = new Map<string, typeof found>()
        for (const o of found) byDay.set(o.startISO.slice(0, 10), [...(byDay.get(o.startISO.slice(0, 10)) ?? []), o])
        const picks = [...byDay.values()].map((v) => v[0]).slice(0, 3)
        for (const o of found) if (picks.length < 3 && !picks.includes(o)) picks.push(o)
        picks.sort((p, q) => p.startISO.localeCompare(q.startISO))
        cards.push({ type: "times", clientId, name: nameOf(clientId), kind, place, minutes, message: str(input.message, 1500), options: picks })
        return JSON.stringify({
          shown_to_agent: picks.map((p) => p.label),
          note: "The agent sees these times as a card to tick, then your message to approve. Don't list the times again. One short line is enough, and mention the length so they can change it.",
        })
      }

      case "draft_message": {
        const body = await draftAboutFor(db, agentId, clientId, str(input.about, 600))
        if (!body) return "Couldn't write it right now."
        cards.push({ type: "message", clientId, name: nameOf(clientId), body })
        return "Drafted. The agent sees it to edit and send."
      }

      case "schedule_showing": {
        const date = str(input.date, 10)
        const start = str(input.start, 5)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return "Ask for the day and time."
        const [h, m] = start.split(":").map(Number)
        const e = str(input.end, 5)
        const end = /^\d{2}:\d{2}$/.test(e) && e > start ? e : `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        const label = `${formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEEE, MMMM d")} · ${clock(start)}–${clock(end)}`
        cards.push({ type: "showing", clientId, name: nameOf(clientId), place: str(input.address, 200), date, start, end, label })
        return "Ready for the agent to add to the calendar."
      }

      case "prepare_offer":
        return prepareOffer(db, clientId, input, cards, nameOf(clientId))
    }
    return "Unknown tool."
  }

  const h: AgentTurn[] = turns.map((t) => ({ role: t.me ? "user" : "assistant", content: t.text.slice(0, 2000) }))
  while (h.length && h[0].role === "assistant") h.shift()
  const diag: { reason?: string } = {}
  const reply = await runAgent({ system, history: h, tools: TOOLS, run, maxSteps: 10, diag })
  if (reply === null) return { reply: "I couldn’t work on that just now. Try again in a moment. If this keeps happening, message us from Support.", chips: HELP_CHIPS, reason: diag.reason }
  await db.from("ai_drafts").insert({ agent_id: agentId, kind: "agent" })
  return { reply, cards }
}

async function clientFile(db: SupabaseClient, clientId: string, tz: string): Promise<string> {
  const [{ data: c }, { data: docs }, { data: homes }, { data: offers }, { data: collected }, { data: steps }, { data: msgs }] = await Promise.all([
    db.from("clients").select("first_name, last_name, email, phone, address, client_type, budget_min, budget_max, phase, created_at").eq("id", clientId).maybeSingle(),
    db.from("documents").select("title, kind, status, created_at, signed_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    db.from("homes").select("id, address, agent_name, agent_brokerage, agent_email, agent_phone, status, showing_at, notes").eq("client_id", clientId).limit(15),
    db.from("home_offers").select("amount, status, created_at, home_id").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    db.from("collected_docs").select("title, received, file_path").eq("client_id", clientId).limit(20),
    db.from("steps").select("title, owner, due_on").eq("client_id", clientId).eq("done", false).limit(15),
    db.from("messages").select("sender, body, created_at").eq("client_id", clientId).not("body", "is", null).order("created_at", { ascending: false }).limit(6),
  ])
  if (!c) return "Couldn't open that file."
  return JSON.stringify({
    name: full(c as { first_name: string; last_name: string }),
    email: c.email ?? "",
    phone: c.phone ?? "",
    current_address: c.address ?? "",
    type: c.client_type ?? "",
    budget: [c.budget_min, c.budget_max].filter(Boolean).map((n) => usd(n as number)).join(" to "),
    stage: c.phase ?? "",
    client_since: (c.created_at as string)?.slice(0, 10),
    agreements_and_documents: (docs ?? []).map((d) => `${d.title} (${d.kind}): ${d.status}${d.signed_at ? `, signed ${String(d.signed_at).slice(0, 10)}` : ""}`),
    homes: (homes ?? []).map((x) => ({
      address: x.address,
      status: x.status,
      listing_agent: [x.agent_name, x.agent_brokerage, x.agent_email, x.agent_phone].filter(Boolean).join(", "),
      showing: x.showing_at ? formatInTimeZone(new Date(x.showing_at as string), tz, "yyyy-MM-dd HH:mm") : "",
      notes: x.notes,
    })),
    offers: (offers ?? []).map((o) => `${usd(o.amount as number)} on ${(homes ?? []).find((x) => x.id === o.home_id)?.address ?? "a home"}: ${o.status}, sent ${String(o.created_at).slice(0, 10)}`),
    documents_collected: (collected ?? []).map((d) => `${d.title}: ${d.received ? (d.file_path ? "received, file on hand" : "received") : "still waiting"}`),
    open_steps: (steps ?? []).map((s) => `${s.title} (${s.owner === "client" ? "client owes it" : "agent"})${s.due_on ? `, due ${s.due_on}` : ""}`),
    latest_messages: (msgs ?? []).reverse().map((m) => `${m.sender === "client" ? "Client" : "Agent"} (${String(m.created_at).slice(0, 10)}): ${String(m.body).slice(0, 300)}`),
  })
}

async function prepareOffer(db: SupabaseClient, clientId: string, input: Record<string, unknown>, cards: ChatCard[], name: string): Promise<string> {
  const address = str(input.address, 200)
  const amount = num(input.amount)
  const [{ data: homes }, { data: collected }, { data: forms }] = await Promise.all([
    db.from("homes").select("id, address, agent_name, agent_brokerage, agent_email, agent_phone").eq("client_id", clientId).limit(30),
    db.from("collected_docs").select("id, title, file_path").eq("client_id", clientId).not("file_path", "is", null).limit(10),
    db.from("pdf_templates").select("id, title, fields").eq("kind", "offer").order("created_at").limit(5),
  ])
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const home = (homes ?? []).find((x) => key(String(x.address)).startsWith(key(address.split(",")[0])) || key(address).startsWith(key(String(x.address).split(",")[0])))
  const listingEmail = str(input.listing_agent_email, 200) || String(home?.agent_email ?? "")
  const form = (forms ?? [])[0] as { id: string; title: string; fields: PdfField[] | null } | undefined
  const blanksNeeded = form ? customBlanks(form.fields ?? []).map((k) => k.slice(7)) : []
  const given = (input.form_blanks && typeof input.form_blanks === "object" ? input.form_blanks : {}) as Record<string, string>
  const givenKeyed: Record<string, string> = {}
  for (const [k, v] of Object.entries(given)) givenKeyed[k.trim().toLowerCase()] = String(v ?? "").trim()

  const missing: string[] = []
  if (!address) missing.push("the home's address")
  if (!amount) missing.push("the offer price")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listingEmail)) missing.push("the seller's agent's email")
  const formMissing = blanksNeeded.filter((b) => !(b.toLowerCase() in givenKeyed))
  if (missing.length || formMissing.length)
    return `Still missing: ${[...missing, ...formMissing.map((b) => `"${b}" for the offer form`)].join(", ")}. Ask the agent for all of it in one question. (If the agent says to leave a form blank empty, pass it as an empty string.)`

  const financing = FINANCING.includes(str(input.financing)) ? str(input.financing) : "Conventional"
  const contingencies = Array.isArray(input.contingencies) ? (input.contingencies as unknown[]).map(String).filter((x) => CONTINGENCIES.includes(x)) : ["Inspection", "Appraisal", "Mortgage"]
  const closingOn = /^\d{4}-\d{2}-\d{2}$/.test(str(input.closing_date)) ? str(input.closing_date) : ""
  const goodDate = /^\d{4}-\d{2}-\d{2}$/.test(str(input.good_until_date)) ? str(input.good_until_date) : ""
  const goodTime = /^\d{2}:\d{2}$/.test(str(input.good_until_time)) ? str(input.good_until_time) : "17:00"
  const formBlanks: Record<string, string> = {}
  for (const b of blanksNeeded) formBlanks[`custom:${b}`] = givenKeyed[b.toLowerCase()] ?? ""
  const docs = (collected ?? []) as { id: string; title: string }[]

  const offer: OfferDraft = {
    homeId: (home?.id as string) ?? null,
    address: (home?.address as string) || address,
    amount: amount!,
    deposit: num(input.deposit),
    financing,
    contingencies,
    closingOn,
    goodDate,
    goodTime,
    agentName: str(input.listing_agent_name, 120) || String(home?.agent_name ?? ""),
    agentBrokerage: str(input.listing_agent_brokerage, 120) || String(home?.agent_brokerage ?? ""),
    agentEmail: listingEmail,
    agentPhone: String(home?.agent_phone ?? ""),
    message: str(input.note, 2000),
    docIds: docs.map((d) => d.id),
    formId: form?.id ?? "",
    formBlanks,
  }
  const rows = [
    { k: "Home", v: offer.address },
    { k: "Price", v: usd(offer.amount) },
    offer.deposit ? { k: "Earnest money", v: usd(offer.deposit) } : null,
    { k: "Financing", v: financing },
    { k: "Contingencies", v: contingencies.join(", ") || "None" },
    closingOn ? { k: "Closing", v: longDate(closingOn) } : null,
    goodDate ? { k: "Good until", v: `${longDate(goodDate)}, ${clock(goodTime)}` } : null,
    { k: "To", v: [offer.agentName, offer.agentEmail].filter(Boolean).join(" · ") },
  ].filter((r): r is { k: string; v: string } => !!r)
  const attach = [form ? `${form.title} (filled in)` : "", ...docs.map((d) => d.title)].filter(Boolean)
  cards.push({ type: "offer", clientId, name, offer, rows, attach })
  return `Ready for review.${form ? "" : " The agent hasn't uploaded their own offer form, so it goes as a clean summary email. Mention they can add their form under Templates."}${docs.length ? "" : " No client documents on file to attach, like a pre-approval. Mention it."}`
}

function clock(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ap = h >= 12 ? "PM" : "AM"
  const hh = h % 12 || 12
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`
}
