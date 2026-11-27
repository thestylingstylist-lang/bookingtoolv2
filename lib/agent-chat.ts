import "server-only"
import { assistantDisplayName } from "@/lib/assistant-name"
import { loadMeetAgent, availability, openTimes, toMeetKind } from "@/lib/meetings"
import { OPS_TOOLS, OPS_NAMES, runOp, clientDetails } from "@/lib/diana-ops"
import { fittingStatus, fittingTimes, bookFitting } from "@/lib/fitting"
import { memories as loadMemories, remember, forget } from "@/lib/diana-memory"

import type { SupabaseClient } from "@supabase/supabase-js"
import { formatInTimeZone } from "date-fns-tz"
import { runAgent, type AgentTool, type AgentTurn } from "@/lib/ai"
import { draftAboutFor } from "@/lib/assistant"
import { daysUntil, longDate } from "@/lib/due"
import { prepareAgreement } from "@/lib/agreement-fill"
import { customBlanks, type PdfField } from "@/lib/pdf-fields"
import { loadStepFacts, doneByFacts } from "@/lib/auto-steps"

// The assistant in the chat. Claude gets the tools below and works step by step
// (look up the client, check the file, fill the paperwork, write the note) until
// the job is ready. Anything that reaches a client or another agent comes back
// as a card the agent sends with one tap.

export type ChatCard =
  | { type: "message"; clientId: string; name: string; body: string; stepId?: string }
  | { type: "confirm"; op: string; args: Record<string, string>; title: string; detail: string; button: string }
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
    name: "fitting_times",
    description: "Open times for the agent's private fitting with the Marvberry team, in the agent's time zone. Optionally one day.",
    input_schema: { type: "object", properties: { day: { type: "string", description: "YYYY-MM-DD, optional" } } },
  },
  {
    name: "book_fitting",
    description: "Book the agent's private fitting with the Marvberry team at a time they picked from fitting_times. The agent gets a confirmation email.",
    input_schema: {
      type: "object",
      properties: {
        start: { type: "string", description: "The start value from fitting_times" },
        how: { type: "string", enum: ["phone", "video"] },
        phone: { type: "string", description: "Only if the agent gave a phone number because none is on file" },
      },
      required: ["start", "how"],
    },
  },
  {
    name: "all_clients",
    description:
      "Every one of the agent's clients in one look, never a sample: stage, open steps and who owes them, documents out for signature, documents still to collect, homes and offers, new client activity, follow-ups. Use it for any question about which clients or which deals.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "client_file",
    description:
      "Everything on one client's file, with ids: details, journey stage and next stage, open steps, documents and signatures, documents to collect, homes and offers, listing, open houses, offers received, notes, upcoming events. Read this before acting for a client.",
    input_schema: { type: "object", properties: { client_id: { type: "string" } }, required: ["client_id"] },
  },
  {
    name: "show",
    description:
      "Open something for the agent to see: a client's file or their steps and documents, the calendar, bookings, the client list, deals, follow-ups, what's new from clients, the card, templates or settings. A client's documents are in their steps and documents. Use it whenever the agent asks to see, open, show or pull up something. The agent gets it as a card to tap.",
    input_schema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          enum: ["client", "client_steps", "calendar", "bookings", "clients", "deals", "follow_ups", "new_from_clients", "card", "templates", "settings", "home"],
        },
        client_id: { type: "string", description: "For client and client_steps." },
      },
      required: ["page"],
    },
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
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        confirmed_new: { type: "boolean", description: "Only after the agent confirmed this is a different person from a similar existing client." },
      },
      required: ["first_name"],
    },
  },
  {
    name: "prepare_agreement",
    description:
      "Prepare the client's buyer agreement from the agent's own template. Checks first whether one is already signed or sent. Every blank (date, names, addresses, commission) is filled from the client file and Settings. Any blank still without a value comes back: ask the agent, then call again with blanks filled. When ready, the agent gets it to review and send.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        template_id: { type: "string", description: "Optional. A specific template from list_templates; the buyer agreement if left out." },
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
    name: "save_client_email",
    description: "Save an email address on a client the agent already has. Use when the agent gives you a client's email.",
    input_schema: {
      type: "object",
      properties: { client_id: { type: "string" }, email: { type: "string" } },
      required: ["client_id", "email"],
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
  ...OPS_TOOLS.filter((x) => x.name !== "client_details"),
  {
    name: "remember",
    description:
      "Keep a short note for future conversations: something about the agent (a preference or habit) or about one of their clients that the agent told you. Only what's worth keeping, in a few words, not every detail.",
    input_schema: {
      type: "object",
      properties: { note: { type: "string" }, client_id: { type: "string", description: "Only if the note is about one client." } },
      required: ["note"],
    },
  },
  {
    name: "forget",
    description: "Remove a note you keep, by its id from the notes in your instructions. Use when the agent says to forget something.",
    input_schema: { type: "object", properties: { memory_id: { type: "string" } }, required: ["memory_id"] },
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

  const agentEmail = await db.auth.getUser().then((r) => r.data.user?.email ?? "", () => "")
  const [{ data: agent }, { data: clientRows }, { count: used }] = await Promise.all([
    db.from("agents").select("full_name, business_name, timezone, assistant_name").eq("id", agentId).maybeSingle(),
    db.from("clients").select("id, first_name, last_name, phase").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(5000),
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
  const opsCtx = { db: db as unknown as Parameters<typeof clientDetails>[0]["db"], agentId, tz, clients: clients as { id: string; first_name: string | null; last_name: string | null }[], cards: cards as Parameters<typeof clientDetails>[0]["cards"] }
  const nameOf = (id: string) => {
    const c = clients.find((x) => x.id === id)
    return c ? full(c) : ""
  }

  // The agent's usual meeting lengths, for Diana's suggestions.
  const meetAgent = await loadMeetAgent(db, agentId).catch(() => null)
  const meetLen = { call: meetAgent?.call_minutes ?? 30, inperson: meetAgent?.inperson_minutes ?? 60 }

  // What Diana keeps between conversations, private to this agent.
  const kept = await loadMemories(db, agentId).catch(() => [])
  const keptText = kept.length
    ? kept.map((m) => `- [${m.id}] ${m.client_name ? `About ${m.client_name}: ` : ""}${m.body}`).join("\n")
    : "Nothing yet."

  const system = `You are ${me}, the real estate assistant for ${agentName || "this agent"}${agent?.business_name ? ` at ${agent.business_name}` : ""}. You work inside Marvberry.

Who you are. You're a seasoned executive assistant to a luxury real estate agent. You've run offices like this for years. You know how a deal moves from first booking to closing (consult, buyer agreement, pre-approval, showings, offer, inspection, appraisal, mortgage commitment, final walk-through, closing), the paperwork it takes and the timing. You are the office: the agent is out in the field, and you keep everything moving behind them. You are calm, exact and discreet. You don't think out loud and you don't explain yourself. You decide, prepare and report.

How you handle every request:
1. Understand it. If the message is unclear or a word seems missing, ask one short question and stop. Don't guess.
2. Look it up. Every fact about clients, deals, homes, offers, documents, bookings or the calendar comes from your tools, every time, even when you think you know. A question about which clients or which deals covers all of them: use all_clients. Never answer from memory, and never say you only checked some.
3. Do the work. Prepare the finished thing (the reply, the document, the change, the approval card) so ${agentName.split(" ")[0] || "the agent"} only has to approve it. Don't ask for anything you can find in the records. Ask only for what you truly can't know, all at once, in one short question.
4. Report like an executive assistant. Say what's true, with the real details (who, what, which home, the date and the time), then what's ready for the agent. That's the whole answer.

What you never do:
- Never talk about your process, what you checked, or a mistake. No "let me look", "I should have", "that was more than you asked". If something you said was wrong, give the right answer in one line, as if for the first time.
- Never add what wasn't asked, with one exception: if you see a real risk on a deal (a deadline about to pass, an offer out without an agreement), flag it in one short line. Everything else waits for the morning note.
- Never suggest a next step unless something is clearly waiting on the agent. Then it's one short sentence or a yes-or-no question, said with confidence, never "if you'd like" or "whenever you like".
- Never invent a name, price, date, time, address, email or term. Never mention a client, document or event that isn't in the agent's records.
- Never say something was sent. Anything going to a client or another agent comes back as a card ${agentName.split(" ")[0] || "the agent"} sends with one tap; say it's ready.
- Never tell the agent something is missing or broken until your tools say so plainly. If a tool hands you an instruction, follow it quietly.
- Never assume anyone's gender. Use the client's first name, not he or she, unless a pronoun is written in their file. The same goes for attorneys, lenders and other agents.
- No legal, tax or loan advice. Say it's one for their attorney or lender, and offer to draft the question.
- If the agent's own agreement isn't in Templates yet, never make one up. It's set up at their private fitting with the Marvberry team: if the fitting is booked, say when; if not, offer to book it and ask what times suit them. Apart from the private fitting, never mention the team, setup times or how Marvberry works behind the scenes.

Approvals:
- If the agent asked for it, do it and confirm in one line.
- Anything that sends, notifies a client, deletes, reopens or redoes something waits for a yes, even when the agent asked: use propose, or a draft the agent approves.
- If it's your own idea, propose it and wait.
- Before adding anything new (a client, home, step, event, template, open house or document to collect), make sure it isn't already there. If you can't tell whether it's the same thing, ask.
- Some things are done on their own page: uploading a logo or headshot, placing blanks on a PDF template, billing and passwords. Point the agent there in one line.
- You can do everything the agent can do in Marvberry: clients, steps and stages, documents and signatures, templates, homes and offers, seller tools, the calendar, bookings, meetings, messages, reminders, the suite link, settings and the card.

How you talk:
- Warm, plain and short, like a trusted assistant leaning into the office. Spoken words, not written ones.
- Small talk gets small talk: greet them by first name, ask how their day is going, and leave work out of it. Use your tools only when they ask about work.
- When the agent shares good news, acknowledge it warmly in a few words, then get on with it.
- "Can I see…", "show me…", "open…" or "pull up…": open it with show and reply with one short line.
- One client at a time, as the agent asks. Never show step cards and the same list in words together; show cards only when the agent asks to see the list.
- One question at a time, and never re-ask something still waiting on an answer. Never repeat what you already said.
- A light exclamation mark is welcome for greetings and good news. Never more than one in a reply.
- Plain text only: no asterisks, pound signs or bullet symbols. Several items go on separate lines.
- Say "real estate agent", never "realtor"; "attorney", never "lawyer"; "seller's agent", never "listing agent". Never use the word "need" when writing to clients.

What you remember. These notes are yours from earlier conversations, private to this agent. Use them quietly where they help; don't recite them.
${keptText}
- Keep what matters with remember: the agent's preferences and habits, and what they tell you about clients. Short notes. Nothing already in the client's file.
- When the agent says to forget something, remove it with forget and confirm in one line.

Arranging meetings:
- You see the agent's whole Marvberry calendar with check_calendar. Answer availability questions briefly from it.
- Ask only for what you don't know, one question at a time. If they haven't said how, ask whether in person or by phone. Only for in person, ask where: at the property or somewhere else. Never suggest a place yourself.
- Video calls only if the agent asks; they use the meeting link in Settings, and if there isn't one, ask for it.
- Suggest a sensible length and invite a change in the same breath: usually ${meetLen.call} minutes for a call and ${meetLen.inperson} in person, unless the agent said otherwise.
- Then use suggest_meeting_times and write the invitation in the agent's voice. The agent picks the times and approves the message. Offered times are held while the client chooses; after 48 hours without an answer, or once every time has passed, the holds are released and you tell the agent.

Today is ${formatInTimeZone(new Date(), tz, "EEEE, MMMM d, yyyy (yyyy-MM-dd)")}, and it is ${formatInTimeZone(new Date(), tz, "h:mm a")} for the agent, time zone ${tz}.${ctx ? `\nThe agent has ${full(ctx)}'s file open (client id ${ctx.id}). "Her", "him", "them" or no name means ${full(ctx)}.` : ""}`

  async function run(name: string, input: Record<string, unknown>): Promise<string> {
    const clientId = str(input.client_id, 60)
    if (["client_file", "prepare_agreement", "draft_message", "schedule_showing", "prepare_offer", "suggest_meeting_times", "save_client_email"].includes(name) && !clients.some((c) => c.id === clientId))
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

      case "fitting_times": {
        const day = /^\d{4}-\d{2}-\d{2}$/.test(str(input.day, 10)) ? str(input.day, 10) : undefined
        const times = await fittingTimes(tz, day)
        if (!times.length) return day ? "No open fitting times that day. Offer the nearest other days from fitting_times without a day." : "No open fitting times right now. Say the team will reach out to set a time."
        return JSON.stringify({ times, note: "Offer two or three that fit what the agent said, in plain words." })
      }

      case "book_fitting": {
        const start = str(input.start, 40)
        const fit = await fittingStatus(agentEmail, tz)
        if (fit.booked) return `Already booked: ${fit.when}. Say so in one line.`
        let phone = str(input.phone, 40)
        if (!phone) {
          const { data: ph } = await db.from("agents").select("office_phone").eq("id", agentId).maybeSingle()
          phone = ((ph as { office_phone?: string | null } | null)?.office_phone || "").trim()
        }
        if (!phone) return "Ask for the best phone number for the fitting, then call book_fitting again with it."
        const [firstName, ...rest] = (agentName || "").trim().split(/\s+/)
        const r = await bookFitting({ first: firstName || "Agent", last: rest.join(" "), email: agentEmail, phone, how: input.how === "phone" ? "phone" : "virtual", start })
        if (!r.ok) return `${(r as { error?: string }).error || "That time didn't book."} Offer other times from fitting_times.`
        const when = formatInTimeZone(new Date(start), tz, "EEEE, MMMM d 'at' h:mm a")
        return `Booked: their private fitting is ${when}${input.how === "phone" ? ", by phone" : ", by video"}. A confirmation is in their email. Confirm in one line.`
      }

      case "all_clients": {
        const ids = clients.map((c) => c.id)
        if (!ids.length) return "The agent has no clients yet."
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safe = async <T,>(q: PromiseLike<any>): Promise<T[]> => {
          try {
            const r = (await q) as { data: T[] | null; error: unknown }
            return r.error ? [] : (r.data ?? [])
          } catch {
            return []
          }
        }
        const [meta, steps, docs, collect, homes, offers, acts] = await Promise.all([
          safe<{ id: string; client_type: string | null; sell_phase: string | null; status: string | null; archived: boolean | null; follow_up_at?: string | null }>(
            db.from("clients").select("id, client_type, sell_phase, status, archived, follow_up_at").eq("agent_id", agentId),
          ),
          safe<{ client_id: string; title: string; owner: string; due_on: string | null }>(db.from("steps").select("client_id, title, owner, due_on").eq("done", false).in("client_id", ids)),
          safe<{ client_id: string; title: string; status: string }>(db.from("documents").select("client_id, title, status").in("client_id", ids)),
          safe<{ client_id: string; title: string; received: boolean }>(db.from("collected_docs").select("client_id, title, received").in("client_id", ids)),
          safe<{ client_id: string; address: string; status: string; client_offer_at: string | null }>(db.from("homes").select("client_id, address, status, client_offer_at").in("client_id", ids)),
          safe<{ client_id: string; amount: number; status: string; homes: { address: string } | null }>(db.from("home_offers").select("client_id, amount, status, homes(address)").in("client_id", ids)),
          safe<{ client_id: string; line: string }>(db.from("client_activity").select("client_id, line").is("seen_at", null).in("client_id", ids)),
        ])
        const m = new Map(meta.map((x) => [x.id, x]))
        const by = <T extends { client_id: string }>(rows: T[], id: string) => rows.filter((r) => r.client_id === id)
        const list = clients.map((c) => {
          const x = m.get(c.id)
          const st = by(steps, c.id)
          return {
            id: c.id,
            name: full(c),
            type: x?.client_type || "buyer",
            stage: x?.client_type === "seller" ? x?.sell_phase || "" : c.phase || "",
            archived: !!x?.archived || (!!x?.status && x.status !== "active"),
            agent_owes: st.filter((t) => t.owner === "agent").map((t) => `${t.title}${t.due_on ? ` (due ${t.due_on})` : ""}`),
            client_owes: st.filter((t) => t.owner === "client").map((t) => `${t.title}${t.due_on ? ` (due ${t.due_on})` : ""}`),
            others_owe: st.filter((t) => t.owner !== "agent" && t.owner !== "client").map((t) => `${t.title} (${t.owner})`),
            awaiting_signature: by(docs, c.id).filter((d) => d.status === "sent").map((d) => d.title),
            signed: by(docs, c.id).filter((d) => d.status === "signed").map((d) => d.title),
            to_collect: by(collect, c.id).filter((d) => !d.received).map((d) => d.title),
            homes: by(homes, c.id).map((h) => `${h.address.split(",")[0]} (${h.status}${h.client_offer_at ? ", client asked to make an offer" : ""})`),
            offers: by(offers, c.id).map((o) => `${usd(o.amount)} on ${o.homes?.address?.split(",")[0] ?? "a home"} (${o.status})`),
            new_activity: by(acts, c.id).map((a) => a.line),
            kept_for_follow_up: !!x?.follow_up_at,
          }
        })
        return JSON.stringify({
          total_clients: list.length,
          note: "This is every client the agent has. Answer from it, naming each client that fits. Leave out empty fields in your answer.",
          clients: list,
        })
      }

      case "client_file":
        return clientDetails(opsCtx, clientId)

      case "show": {
        const page = str(input.page, 40)
        const cid = str(input.client_id, 60) || clientId
        const who = cid ? clients.find((c) => c.id === cid) : undefined
        const PAGES: Record<string, { label: string; sub: string; href: string }> = {
          calendar: { label: "Calendar", sub: "Your week", href: "/calendar" },
          bookings: { label: "Bookings", sub: "Everyone who booked you", href: "/bookings" },
          clients: { label: "Clients", sub: "Everyone you work with", href: "/clients" },
          deals: { label: "Deals", sub: "Active deals by stage", href: "/clients?stage=all" },
          follow_ups: { label: "Follow-ups due", sub: "Kept for follow-up or waiting on you", href: "/clients?view=follow-up" },
          new_from_clients: { label: "New from your clients", sub: "Notes, times, offer requests, uploads", href: "/dashboard#new-from-clients" },
          card: { label: "Your card", sub: "Saves and messages", href: "/my-card" },
          templates: { label: "Templates", sub: "Your agreements and forms", href: "/templates" },
          settings: { label: "Settings", sub: "Account and company", href: "/settings" },
          home: { label: "Home", sub: "Your dashboard", href: "/dashboard" },
        }
        let item = PAGES[page]
        if (page === "client" || page === "client_steps") {
          if (!who) return "Which client? Ask in one short line."
          item =
            page === "client"
              ? { label: full(who), sub: "Their file", href: `/clients/${who.id}` }
              : { label: `${full(who)}: steps and documents`, sub: "Their file", href: `/clients/${who.id}?tab=tasks` }
        }
        if (!item) return "That page isn't one you can open. Ask what they'd like to see."
        cards.push({ type: "list", items: [item] })
        return "It's on a card the agent can tap. Reply with one short line, like \"Here's Kelly's file.\" Nothing else: no status, no summary, no next step."
      }

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
              : "For your awareness. Answer only what the agent asked, from this. Don't add anything they didn't ask about.",
        })
      }

      case "add_client": {
        const first = str(input.first_name, 80)
        if (!first) return "Ask for their name."
        const email = str(input.email, 200)
        const phone = str(input.phone, 40).replace(/\D/g, "")
        const last = str(input.last_name, 80)
        if (!input.confirmed_new) {
          const { data: same } = await db.from("clients").select("id, first_name, last_name, email, phone").eq("agent_id", agentId).limit(400)
          const match = (same ?? []).find(
            (c) =>
              (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
              (phone.length >= 7 && String(c.phone ?? "").replace(/\D/g, "").endsWith(phone.slice(-7))) ||
              (c.first_name?.toLowerCase() === first.toLowerCase() && (!last || !c.last_name || c.last_name.toLowerCase() === last.toLowerCase())),
          )
          if (match)
            return `There's already a client named ${match.first_name ?? ""} ${match.last_name ?? ""}`.trim() + ` (id ${match.id}). Ask the agent, as one natural question, whether it's the same person. If it's someone new, call add_client again with confirmed_new true.`
        }
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
        const tid = str(input.template_id, 60)
        const r = await prepareAgreement(db, agentId, clientId, blanks, tid ? { templateId: tid, ignoreExisting: true } : {})
        if (r.state === "no_client") return "That client's file couldn't be read. Use find_client for the right id and try again."
        if (r.state === "no_template") {
          // No agreement in Templates yet: it's set up at the agent's private fitting with the Marvberry team.
          cards.push({ type: "agreement_setup" })
          const fit = await fittingStatus(agentEmail, tz)
          return fit.booked
            ? `The agent's agreement isn't in Templates yet. Their private fitting with the Marvberry team is ${fit.when}, and the agreement is set up then. Say that in a warm line or two; the card lets them add the file now so it's ready.`
            : "The agent's agreement isn't in Templates yet. Say you're glad to, and that first their agreement gets added: the card lets them drop the file in, and the Marvberry team sets it up at a private fitting. Offer to book the fitting and ask what times suit them. When they answer, use fitting_times, then book_fitting once they pick."
        }
        if (r.state === "signed")
          return `Already signed: "${r.title}", signed ${longDate(r.signedAt.slice(0, 10))} (document id ${r.documentId}). If the agent wants a new one, propose redo_document with that id first, then prepare again.`
        if (r.state === "sent")
          return `"${r.title}" went out on ${longDate(r.sentAt.slice(0, 10))} and is waiting for a signature (document id ${r.documentId}). If the agent asked to resend it, propose resend_document with that id. Don't prepare a new one.`
        if (r.state === "missing") return `"${r.title}" can't go out yet. These blanks have no value in the client file or Settings: ${r.missing.map((m) => `"${m}"`).join(", ")}. Ask the agent for them one at a time, in plain words, then call again with blanks keyed by those exact labels. Never send or show an agreement with a blank left in it.`
        cards.push({ type: "agreement", clientId, name: nameOf(clientId), title: r.title, body: r.body, email: r.email })
        return `Ready. The agent sees the full agreement to review and send.${r.email ? "" : " The client has no email on file, so it will land on their page only. Mention it."}`
      }

      case "save_client_email": {
        const email = str(input.email, 200).toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That email doesn't look right. Ask the agent to check it."
        const { error } = await db.from("clients").update({ email }).eq("id", clientId).eq("agent_id", agentId)
        return error ? "It didn't save. Say so plainly and suggest adding it on the client's page." : "Saved."
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
        const { data: who } = await db.from("clients").select("first_name, email").eq("id", clientId).maybeSingle()
        if (!who?.email)
          return `${who?.first_name || "This client"} has no email yet, and the invitation goes by email as well as their suite. Ask for their email as one natural question, save it with save_client_email, then suggest times.`
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
    if (name === "remember") {
      const cid = str(input.client_id, 60)
      if (cid && !clients.some((c) => c.id === cid)) return "That client isn't in the agent's list, so nothing was kept."
      const res = await remember(db, agentId, str(input.note, 300), cid || null)
      return res.ok ? "Kept. Mention it only if it matters, naturally." : "It didn't save. Carry on without mentioning it."
    }
    if (name === "forget") {
      const ok = await forget(db, agentId, str(input.memory_id, 60))
      return ok ? "Forgotten. Confirm in one short line." : "Couldn't find that note. Ask which one."
    }
    if (OPS_NAMES.has(name)) return runOp(opsCtx, name, input)
    return "Unknown tool."
  }

  const h: AgentTurn[] = turns.map((t) => ({ role: t.me ? "user" : "assistant", content: t.text.slice(0, 2000) }))
  while (h.length && h[0].role === "assistant") h.shift()
  const diag: { reason?: string } = {}
  const reply = await runAgent({ system, history: h, tools: TOOLS, run, maxSteps: 14, diag })
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
  // Open steps, minus any done by what has happened, read the same way as the client's suite.
  const openByFacts = <T extends { title: string }>(list: T[], f: Awaited<ReturnType<typeof loadStepFacts>>) => list.filter((x) => !doneByFacts(x.title, f))
  return JSON.stringify({
    name: full(c as { first_name: string; last_name: string }),
    email: c.email ?? "",
    phone: c.phone ?? "",
    current_address: c.address ?? "",
    type: c.client_type ?? "",
    budget: [c.budget_min, c.budget_max].filter(Boolean).map((n) => usd(n as number)).join(" to "),
    stage: c.phase ?? "",
    client_since: (c.created_at as string)?.slice(0, 10),
    agreements_and_documents: (docs ?? []).map((d) => `${d.title} (${d.kind}): ${d.status === "draft" ? "agent signed, waiting on the broker's signature before it goes to the client" : d.status === "sent" ? "with the client to sign" : d.status}${d.signed_at ? `, signed by everyone ${String(d.signed_at).slice(0, 10)}, signed PDF in the client's file` : ""}`),
    homes: (homes ?? []).map((x) => ({
      address: x.address,
      status: x.status,
      listing_agent: [x.agent_name, x.agent_brokerage, x.agent_email, x.agent_phone].filter(Boolean).join(", "),
      showing: x.showing_at ? formatInTimeZone(new Date(x.showing_at as string), tz, "yyyy-MM-dd HH:mm") : "",
      notes: x.notes,
    })),
    offers: (offers ?? []).map((o) => `${usd(o.amount as number)} on ${(homes ?? []).find((x) => x.id === o.home_id)?.address ?? "a home"}: ${o.status}, sent ${String(o.created_at).slice(0, 10)}`),
    documents_collected: (collected ?? []).map((d) => `${d.title}: ${d.received ? (d.file_path ? "received, file on hand" : "received") : "still waiting"}`),
    open_steps: openByFacts((steps ?? []) as { title: string; owner: string; due_on: string | null }[], await loadStepFacts(db, clientId)).map((s) => `${s.title} (${s.owner === "client" ? "client owes it" : "agent"})${s.due_on ? `, due ${s.due_on}` : ""}`),
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
