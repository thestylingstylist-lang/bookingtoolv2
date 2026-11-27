import "server-only"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import type { SupabaseClient } from "@supabase/supabase-js"
import { BUY_PHASES, SELL_PHASES, journeyOf, stageLabel, type Phase } from "@/lib/phases"
import { journeysFor } from "@/lib/suite"
import type { AgentTool } from "@/lib/ai"

// Everything an agent can do in Marvberry, for Diana. Wherever a button already
// does the job, Diana calls that same action, so her changes behave exactly
// like the agent's own clicks.
import { loadReplaced } from "@/lib/auto-steps"
import { addTask, setDueDate, toggleTask, deleteTask, movePhase, addStandardSteps, addCollected, toggleCollected, deleteCollected, reopenStep, redoDocument, renameStep } from "@/app/clients/[id]/checklist-actions"
import { saveDeal, addNote, deleteNote } from "@/app/clients/[id]/panel-actions"
import { addHome, saveHome, setHomeStatus, removeHome, followUpOffer, setOfferStatus, updateHomeAddress } from "@/app/clients/[id]/homes-actions"
import { saveSaleHome, setPrivateShowings, addOpenHouse, saveFeedback, deleteOpenHouse, addSaleOffer, updateSaleOffer, deleteSaleOffer } from "@/app/clients/[id]/seller-actions"
import { updateClient, deleteClient, addClientFromBooking, deleteBooking } from "@/app/clients/actions"
import { addEvent, holdTime, deleteEvent } from "@/app/calendar/actions"
import { createTemplate, updateTemplate, deleteTemplate } from "@/app/templates/actions"
import { sendDocument, resendDocument } from "@/app/clients/[id]/actions"
import { prepareAgreement } from "@/lib/agreement-fill"
import { loadStepFacts, withFacts } from "@/lib/auto-steps"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sendPortalLink } from "@/app/clients/[id]/portal-actions"
import { saveAccount } from "@/app/settings/actions"
import { saveMeetingLengths } from "@/app/settings/meeting-actions"
import { saveNotifySettings } from "@/app/notify-actions"
import { markReplied, makeClient, saveCardDetails } from "@/app/dashboard/card-actions"
import { sendNudge } from "@/app/dashboard/nudge-actions"
import { draftReply, draftReminder } from "@/app/clients/[id]/draft-actions"
import { sendSupportMessage } from "@/app/support-actions"
import { saveAssistantName, saveBrokerage, savePhone, saveHours } from "@/app/dashboard/welcome-actions"

export type ConfirmCard = { type: "confirm"; op: string; args: Record<string, string>; title: string; detail: string; button: string }
export type DraftCard = { type: "message"; clientId: string; name: string; body: string; stepId?: string }

type Ctx = {
  db: SupabaseClient
  agentId: string
  tz: string
  clients: { id: string; first_name: string | null; last_name: string | null }[]
  cards: (ConfirmCard | DraftCard)[]
}

// ---------------------------------------------------------------- calling actions

type Result = { ok: boolean; err?: string }

// The page actions finish with a redirect; an "?error=" in it means it failed.
async function act(fn: (fd: FormData) => Promise<unknown>, fields: Record<string, string | string[] | undefined | null>): Promise<Result> {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x))
    else fd.set(k, v)
  }
  try {
    const r = (await fn(fd)) as { ok?: boolean; message?: string } | undefined
    if (r && typeof r === "object" && "ok" in r) return { ok: !!r.ok, err: r.message }
    return { ok: true }
  } catch (e) {
    const digest = (e as { digest?: string })?.digest ?? ""
    if (digest.startsWith("NEXT_REDIRECT")) {
      const url = digest.split(";")[2] ?? ""
      const m = /[?&]error=([^&#]+)/.exec(url)
      return m ? { ok: false, err: decodeURIComponent(m[1]) } : { ok: true }
    }
    console.error("[diana-ops]", e)
    return { ok: false, err: (e as Error)?.message }
  }
}

// For actions shaped (previousState, formData), like the ones behind forms with live messages.
const act2 = (fn: (prev: null, fd: FormData) => Promise<unknown>, fields: Record<string, string | string[] | undefined | null>) =>
  act((fd) => fn(null, fd), fields)

async function returns<T>(p: Promise<T>): Promise<Result> {
  try {
    const r = (await p) as unknown as { ok?: boolean; message?: string } | undefined
    if (r && typeof r === "object" && "ok" in r) return { ok: !!r.ok, err: r.message }
    return { ok: true }
  } catch (e) {
    const digest = (e as { digest?: string })?.digest ?? ""
    if (digest.startsWith("NEXT_REDIRECT")) return { ok: !/[?&]error=/.test(digest) }
    console.error("[diana-ops]", e)
    return { ok: false, err: (e as Error)?.message }
  }
}

const S = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "")
const N = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}
const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
const done = (what: string) => `Done: ${what}. Confirm it in one short line.`
const failed = (what: string, r: Result) =>
  `${what} didn't work${r.err && r.err.length < 80 ? ` (${r.err})` : ""}. Say so plainly and suggest doing it on the page.`
const proposed = "The agent sees it as a card to approve. Say in one short line what it is; don't repeat the details."

function nameOf(ctx: Ctx, id: string) {
  const c = ctx.clients.find((x) => x.id === id)
  return c ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "this client" : "this client"
}
const firstOf = (ctx: Ctx, id: string) => nameOf(ctx, id).split(" ")[0]

const STAGE_KEYS = [...BUY_PHASES, ...SELL_PHASES].map((p) => p.key)

// ---------------------------------------------------------------- tools

const id = (d = "") => ({ type: "string", description: d })
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required })

export const OPS_TOOLS: AgentTool[] = [
  {
    name: "client_details",
    description: "The client's whole file with ids: details, stage and next stage, open steps, documents and signatures, homes and offers, listing, open houses and offers received, notes, upcoming events. Read before changing anything for a client.",
    input_schema: obj({ client_id: id() }, ["client_id"]),
  },
  {
    name: "update_client",
    description: "Change a client's name, email, phone, current address, type (buyer, seller, investor, both) or buying range. Only the fields given change.",
    input_schema: obj(
      {
        client_id: id(),
        first_name: id(),
        last_name: id(),
        email: id(),
        phone: id(),
        address: id("Their current address"),
        client_type: { type: "string", enum: ["buyer", "seller", "investor", "both"] },
        budget_min: { type: "number" },
        budget_max: { type: "number" },
      },
      ["client_id"],
    ),
  },
  { name: "add_note", description: "Add a private note to a client's file. Only the agent sees it.", input_schema: obj({ client_id: id(), body: id() }, ["client_id", "body"]) },
  {
    name: "move_stage",
    description: `Move a client to a stage of their journey. Buying: ${BUY_PHASES.map((p) => `${p.key} (${p.label})`).join(", ")}. Selling: ${SELL_PHASES.map((p) => `${p.key} (${p.label})`).join(", ")}. Their suite updates; the client isn't notified.`,
    input_schema: obj({ client_id: id(), stage: { type: "string", enum: STAGE_KEYS } }, ["client_id", "stage"]),
  },
  {
    name: "add_step",
    description: "Add a step to a client's journey. Skipped if a step with the same title is already there.",
    input_schema: obj(
      { client_id: id(), title: id(), stage: { type: "string", enum: STAGE_KEYS, description: "Defaults to their current stage." }, owner: { type: "string", enum: ["agent", "client"] }, due: id("YYYY-MM-DD") },
      ["client_id", "title"],
    ),
  },
  {
    name: "update_step",
    description: "Mark a step done, rename it, or set its due date. Reopening a finished step goes through propose (reopen_step).",
    input_schema: obj({ client_id: id(), step_id: id(), done: { type: "boolean" }, title: id("A new name for the step"), due: id("YYYY-MM-DD, or empty to clear") }, ["client_id", "step_id"]),
  },
  {
    name: "add_usual_steps",
    description: "Add Marvberry's usual steps for one of the client's stages. Only if that stage has no steps yet.",
    input_schema: obj({ client_id: id(), stage: { type: "string", enum: STAGE_KEYS } }, ["client_id", "stage"]),
  },
  {
    name: "collect_document",
    description: "Documents to collect from a client: add one to the list (skipped if already there), or mark one received or not.",
    input_schema: obj({ client_id: id(), title: id("To add"), doc_id: id("To mark"), received: { type: "boolean" } }, ["client_id"]),
  },
  {
    name: "save_template",
    description: "Create a written template, or edit one by id. Placeholders in {{double braces}} fill in per client.",
    input_schema: obj({ template_id: id("To edit"), title: id(), body: id() }, ["title", "body"]),
  },
  { name: "list_templates", description: "The agent's written and PDF templates, with ids.", input_schema: obj({}) },
  {
    name: "add_home",
    description: "Add a home a buying client is considering, by address or listing link. Skipped if it's already on their list.",
    input_schema: obj({ client_id: id(), home: id("Address or listing link") }, ["client_id", "home"]),
  },
  {
    name: "update_home",
    description: "Update a home: notes, listing link, the seller's agent's details, a showing date and time, or set it active or passed. To change its address (any part, including the zip), use propose with action edit_home_address, never remove and re-add.",
    input_schema: obj(
      {
        client_id: id(),
        home_id: id(),
        notes: id(),
        listing_url: id(),
        agent_name: id("Seller's agent"),
        agent_email: id(),
        agent_phone: id(),
        agent_brokerage: id(),
        show_date: id("YYYY-MM-DD"),
        show_time: id("HH:MM, 24-hour"),
        status: { type: "string", enum: ["active", "passed"] },
      },
      ["client_id", "home_id"],
    ),
  },
  {
    name: "record_offer_answer",
    description: "Record the seller's answer to an offer the client made: accepted, countered or declined (or back to sent).",
    input_schema: obj({ offer_id: id(), status: { type: "string", enum: ["sent", "countered", "accepted", "declined"] } }, ["offer_id", "status"]),
  },
  {
    name: "save_listing",
    description: "A selling client's listing: address, price, list date, listing link. Only the fields given change.",
    input_schema: obj({ client_id: id(), address: id(), price: { type: "number" }, listed_on: id("YYYY-MM-DD"), url: id() }, ["client_id"]),
  },
  {
    name: "set_private_showings",
    description: "Switch a selling client between open houses and private showings.",
    input_schema: obj({ client_id: id(), private_showings: { type: "boolean" } }, ["client_id", "private_showings"]),
  },
  {
    name: "add_open_house",
    description: "Add an open house or private showing for a selling client. Skipped if one is already set for that day and time.",
    input_schema: obj({ client_id: id(), kind: { type: "string", enum: ["open_house", "private"] }, date: id("YYYY-MM-DD"), start: id("HH:MM"), end: id("HH:MM") }, ["client_id", "date", "start"]),
  },
  {
    name: "open_house_feedback",
    description: "Save the feedback note for an open house or showing. The seller sees it in their suite.",
    input_schema: obj({ client_id: id(), open_house_id: id(), feedback: id() }, ["client_id", "open_house_id", "feedback"]),
  },
  {
    name: "record_offer_received",
    description: "Record an offer a selling client received, or update one's status (review, countered, accepted, declined) and note.",
    input_schema: obj(
      {
        client_id: id(),
        sale_offer_id: id("To update"),
        amount: { type: "number" },
        terms: id(),
        note: id(),
        received_on: id("YYYY-MM-DD"),
        buyer_agent_name: id(),
        buyer_agent_email: id(),
        status: { type: "string", enum: ["review", "countered", "accepted", "declined"] },
      },
      ["client_id"],
    ),
  },
  {
    name: "add_event",
    description: "Put something on the agent's calendar: a showing, closing, open house, or personal time. If it overlaps something, say so and ask before adding.",
    input_schema: obj(
      { kind: { type: "string", enum: ["showing", "closing", "open_house", "hold"] }, client_id: id("Optional"), place: id(), date: id("YYYY-MM-DD"), start: id("HH:MM"), end: id("HH:MM") },
      ["kind", "date", "start", "end"],
    ),
  },
  { name: "list_bookings", description: "Consultations booked from the agent's link, and requests from their card, with ids.", input_schema: obj({}) },
  {
    name: "booking_to_client",
    description: "Turn a booking into a client. Checks first whether that person is already a client.",
    input_schema: obj({ booking_id: id() }, ["booking_id"]),
  },
  {
    name: "card_request",
    description: "A request from the agent's card: mark it replied, or turn it into a client.",
    input_schema: obj({ request_id: id(), action: { type: "string", enum: ["replied", "make_client"] } }, ["request_id", "action"]),
  },
  { name: "inbox", description: "Which clients have written and what's unread.", input_schema: obj({}) },
  {
    name: "draft_reply",
    description: "Draft a reply to a client's latest messages, in the agent's voice. The agent approves before it sends.",
    input_schema: obj({ client_id: id() }, ["client_id"]),
  },
  {
    name: "draft_reminder",
    description: "Draft a reminder to a client about a step they owe, in the agent's voice. It goes by email once the agent approves.",
    input_schema: obj({ client_id: id(), step_id: id() }, ["client_id", "step_id"]),
  },
  {
    name: "propose",
    description:
      "Anything that sends, notifies a client, deletes or changes a home's address waits for the agent's yes. This shows the agent a card to approve. Actions: send_document (template_id), resend_document (document_id), send_suite_link, follow_up_offer (offer_id, message), support_message (message), delete_client, delete_booking (booking_id), delete_note (note_id), delete_step (step_id), reopen_step (step_id: a finished step goes back to open; reopening Agreement signed marks the signed agreement Replaced), redo_document (document_id: a signed document is kept, marked Replaced, and a new one can be prepared), delete_collected (doc_id), delete_template (template_id), remove_home (home_id), edit_home_address (home_id with address, or zip when only the zip changes; client_view_only true when the agent says to change only what the client sees), delete_open_house (open_house_id), delete_sale_offer (sale_offer_id), delete_event (event_id).",
    input_schema: obj(
      {
        action: {
          type: "string",
          enum: [
            "send_document",
            "resend_document",
            "send_suite_link",
            "follow_up_offer",
            "support_message",
            "delete_client",
            "delete_booking",
            "delete_note",
            "delete_step",
            "reopen_step",
            "redo_document",
            "delete_collected",
            "delete_template",
            "remove_home",
            "edit_home_address",
            "delete_open_house",
            "delete_sale_offer",
            "delete_event",
          ],
        },
        client_id: id(),
        template_id: id(),
        document_id: id(),
        offer_id: id(),
        booking_id: id(),
        note_id: id(),
        step_id: id(),
        doc_id: id(),
        home_id: id(),
        address: id("edit_home_address: the full new address, street, town, state and zip"),
        zip: id("edit_home_address: just the new zip, when only the zip changes"),
        client_view_only: { type: "boolean", description: "edit_home_address: true when the agent says to change only what the client sees" },
        open_house_id: id(),
        sale_offer_id: id(),
        event_id: id(),
        message: id(),
        label: id("What it is, in a few words, e.g. the step's title or the event"),
      },
      ["action"],
    ),
  },
  {
    name: "update_settings",
    description:
      "The agent's own settings. Only the fields given change: booking days (1=Mon..7=Sun) and hours, call length, booking window, notice, public email, phone, brokerage, video meeting link, tagline, the agent's own name, the assistant's name, meeting lengths, notification switches.",
    input_schema: obj({
      weekdays: { type: "array", items: { type: "number" } },
      day_start: { type: "number", description: "Hour, 0-23" },
      day_end: { type: "number" },
      slot_minutes: { type: "number", enum: [15, 20, 30, 45, 60] },
      days_ahead: { type: "number" },
      min_notice_hours: { type: "number" },
      public_email: id(),
      public_phone: id(),
      business_name: id("Brokerage"),
      meeting_link: id("Video meeting link"),
      tagline: id(),
      first_name: id("The agent's own first name"),
      last_name: id(),
      assistant_name: id(),
      meeting_call_minutes: { type: "number" },
      meeting_inperson_minutes: { type: "number" },
      notify_messages: { type: "boolean" },
      notify_signed: { type: "boolean" },
      notify_bookings: { type: "boolean" },
      notify_support: { type: "boolean" },
      notify_hours_only: { type: "boolean" },
    }),
  },
  {
    name: "update_card",
    description: "The agent's digital card: service areas, office address, website, Instagram. Only the fields given change.",
    input_schema: obj({ areas: id(), address: id(), website: id(), instagram: id() }),
  },
]

export const OPS_NAMES = new Set(OPS_TOOLS.map((t) => t.name))
const NEEDS_CLIENT = new Set([
  "client_details",
  "update_client",
  "add_note",
  "move_stage",
  "add_step",
  "update_step",
  "add_usual_steps",
  "collect_document",
  "add_home",
  "update_home",
  "save_listing",
  "set_private_showings",
  "add_open_house",
  "open_house_feedback",
  "record_offer_received",
  "draft_reply",
  "draft_reminder",
])

// ---------------------------------------------------------------- the file

export async function clientDetails(ctx: Ctx, clientId: string): Promise<string> {
  const { db, tz } = ctx
  const [{ data: c }, { data: rawSteps }, { data: docs }, { data: collected }, { data: homes }, { data: offers }, { data: notes }, { data: events }] = await Promise.all([
    db.from("clients").select("first_name, last_name, email, phone, address, client_type, budget_min, budget_max, phase, portal_token").eq("id", clientId).maybeSingle(),
    db.from("steps").select("id, title, owner, due_on, done, phase").eq("client_id", clientId).order("position").limit(80),
    db.from("documents").select("id, title, kind, status, signed_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(12),
    db.from("collected_docs").select("id, title, received").eq("client_id", clientId).limit(30),
    db.from("homes").select("id, address, status, agent_name, agent_email, showing_at, notes, listing_url").eq("client_id", clientId).limit(20),
    db.from("home_offers").select("id, amount, status, created_at, home_id").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    db.from("client_notes").select("id, body, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    db.from("events").select("id, kind, place, starts_at").eq("client_id", clientId).gte("ends_at", new Date().toISOString()).order("starts_at").limit(10),
  ])
  const replacedDocs = await loadReplaced(db as unknown as Parameters<typeof loadReplaced>[0], clientId)
  // What the client did on their own page lately, in full (blank before client-activity.sql).
  let fromClient: { what: string; detail: string; when: string; new: boolean }[] = []
  try {
    const { data: acts, error: actErr } = await db
      .from("client_activity")
      .select("line, detail, created_at, seen_at")
      .eq("client_id", clientId)
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(8)
    if (!actErr)
      fromClient = ((acts ?? []) as { line: string; detail: string | null; created_at: string; seen_at: string | null }[]).map((x) => ({
        what: x.line,
        detail: x.detail ?? "",
        when: formatInTimeZone(new Date(x.created_at), tz, "EEE MMM d, h:mm a"),
        new: !x.seen_at,
      }))
  } catch {}
  if (!c) return "That client isn't in your list."
  // Steps done by what has happened, read the same way as the client's suite and the agent's page.
  const steps = withFacts((rawSteps ?? []) as { id: string; title: string; owner: string; due_on: string | null; done: boolean; phase: string }[], await loadStepFacts(db, clientId))
  // What the client sees for each home, when the agent set it to differ (read apart: a later update).
  const { data: shownRows } = await db.from("homes").select("id, client_address").eq("client_id", clientId).limit(20)
  const shownAs = new Map(((shownRows ?? []) as { id: string; client_address: string | null }[]).map((r) => [r.id, (r.client_address || "").trim()]))
  // Seller fields arrive with a later update; read apart.
  const { data: sell } = await db.from("clients").select("sell_phase, sale_address, sale_price, sale_listed_on, sale_url, private_showings").eq("id", clientId).maybeSingle()
  const { data: openHouses } = await db.from("open_houses").select("id, kind, starts_at, feedback").eq("client_id", clientId).order("starts_at").limit(15)
  const { data: saleOffers } = await db.from("sale_offers").select("id, amount, status, note, received_on").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10)

  const journeys = journeysFor(c.client_type)
  const stageInfo = (j: "buy" | "sell") => {
    const list = j === "buy" ? BUY_PHASES : SELL_PHASES
    const cur = (j === "buy" ? c.phase : sell?.sell_phase) as string | null
    const at = Math.max(0, list.findIndex((p) => p.key === cur))
    const now = list[at]
    const next = list[at + 1]
    const open = (steps ?? []).filter((s) => !s.done && s.phase === now.key)
    return {
      journey: j === "buy" ? "buying" : "selling",
      stage: `${stageLabel(now.key as Phase, !!sell?.private_showings)} (${now.key})`,
      next_stage: next ? `${stageLabel(next.key as Phase, !!sell?.private_showings)} (${next.key})` : "none, this is the last stage",
      open_steps_this_stage: open.map((s) => ({ id: s.id, title: s.title, owner: s.owner, due: s.due_on ?? "" })),
      this_stage_has_steps: (steps ?? []).some((s) => s.phase === now.key),
    }
  }
  const when = (iso: string) => formatInTimeZone(new Date(iso), tz, "EEE MMM d, h:mm a")
  return JSON.stringify({
    id: clientId,
    name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
    email: c.email ?? "",
    phone: c.phone ?? "",
    current_address: c.address ?? "",
    type: c.client_type ?? "not set",
    buying_range: [c.budget_min, c.budget_max].filter(Boolean).join(" to "),
    suite_link_sent: !!c.portal_token,
    journeys: journeys.map(stageInfo),
    other_open_steps: (steps ?? []).filter((s) => !s.done).map((s) => ({ id: s.id, title: s.title, stage: s.phase, due: s.due_on ?? "" })),
    from_client: fromClient,
    documents: (docs ?? []).map((d) => ({ id: d.id, title: d.title, status: replacedDocs.has(d.id as string) ? "replaced (kept in the file; a new one can be prepared)" : d.status, signed: d.signed_at ? String(d.signed_at).slice(0, 10) : "" })),
    to_collect: (collected ?? []).map((d) => ({ id: d.id, title: d.title, received: d.received })),
    homes: (homes ?? []).map((h) => ({ id: h.id, address: h.address, ...(shownAs.get(h.id) ? { client_sees: shownAs.get(h.id) } : {}), status: h.status, sellers_agent: [h.agent_name, h.agent_email].filter(Boolean).join(", "), showing: h.showing_at ? when(h.showing_at) : "", notes: h.notes })),
    offers_made: (offers ?? []).map((o) => ({ id: o.id, amount: o.amount, status: o.status, home: (homes ?? []).find((h) => h.id === o.home_id)?.address ?? "" })),
    listing: sell ? { address: sell.sale_address, price: sell.sale_price, listed_on: sell.sale_listed_on, url: sell.sale_url, private_showings: !!sell.private_showings } : null,
    open_houses: (openHouses ?? []).map((o) => ({ id: o.id, kind: o.kind, when: when(o.starts_at), feedback: o.feedback ?? "" })),
    offers_received: (saleOffers ?? []).map((o) => ({ id: o.id, amount: o.amount, status: o.status, note: o.note ?? "", received: o.received_on })),
    notes: (notes ?? []).map((n) => ({ id: n.id, body: String(n.body).slice(0, 300) })),
    upcoming: (events ?? []).map((e) => ({ id: e.id, kind: e.kind, place: e.place, when: when(e.starts_at) })),
  })
}

// ---------------------------------------------------------------- running

export async function runOp(ctx: Ctx, name: string, input: Record<string, unknown>): Promise<string> {
  const { db, agentId, tz } = ctx
  const clientId = S(input.client_id, 60)
  if (NEEDS_CLIENT.has(name) && !ctx.clients.some((c) => c.id === clientId)) return "No client with that id. Use find_client first."
  const first = clientId ? firstOf(ctx, clientId) : ""

  switch (name) {
    case "client_details":
      return clientDetails(ctx, clientId)

    case "update_client": {
      const { data: c } = await db.from("clients").select("first_name, last_name, email, phone, address, client_type, budget_min, budget_max").eq("id", clientId).maybeSingle()
      if (!c) return "That client isn't in your list."
      const email = S(input.email, 200)
      if (email && !EMAIL.test(email)) return "That email doesn't look right. Ask the agent to check it."
      const changed: string[] = []
      if (["first_name", "last_name", "email", "phone", "address"].some((k) => S(input[k]))) {
        if (email) {
          const { data: dup } = await db.from("clients").select("id, first_name").ilike("email", email).neq("id", clientId).limit(1)
          if (dup?.length) return `${dup[0].first_name ?? "Another client"} already has that email. Ask the agent whether it's the same person before saving.`
        }
        const r = await act(updateClient, {
          id: clientId,
          firstName: S(input.first_name, 80) || c.first_name || "",
          lastName: S(input.last_name, 80) || c.last_name || "",
          email: email || c.email || "",
          phone: S(input.phone, 40) || c.phone || "",
          address: S(input.address, 200) || c.address || "",
          returnTo: `/clients/${clientId}`,
        })
        if (!r.ok) return failed("Saving the details", r)
        changed.push("details")
      }
      if (input.client_type || input.budget_min || input.budget_max) {
        const r = await act(saveDeal, {
          clientId,
          clientType: S(input.client_type, 20) || c.client_type || "",
          budgetMin: String(N(input.budget_min) ?? c.budget_min ?? ""),
          budgetMax: String(N(input.budget_max) ?? c.budget_max ?? ""),
        })
        if (!r.ok) return failed("Saving the type or buying range", r)
        changed.push("type and range")
      }
      return changed.length ? done(`${first}'s ${changed.join(" and ")} updated`) : "Nothing to change. Ask what to update."
    }

    case "add_note": {
      const body = S(input.body, 2000)
      if (!body) return "Ask what the note should say."
      const r = await act(addNote, { clientId, body })
      return r.ok ? done(`note added to ${first}'s file`) : failed("Adding the note", r)
    }

    case "move_stage": {
      const to = S(input.stage, 20)
      if (!STAGE_KEYS.includes(to as Phase)) return "Unknown stage."
      const r = await act(movePhase, { clientId, to })
      return r.ok ? done(`${first} moved to ${stageLabel(to as Phase)}`) : failed("Moving the stage", r)
    }

    case "add_step": {
      const title = S(input.title, 200)
      if (!title) return "Ask what the step is."
      const { data: c } = await db.from("clients").select("phase, client_type").eq("id", clientId).maybeSingle()
      const { data: sell } = await db.from("clients").select("sell_phase").eq("id", clientId).maybeSingle()
      const stage = STAGE_KEYS.includes(S(input.stage, 20) as Phase)
        ? S(input.stage, 20)
        : journeysFor(c?.client_type)[0] === "sell"
          ? sell?.sell_phase || "s_preparing"
          : c?.phase || "preparing"
      const { data: existing } = await db.from("steps").select("title").eq("client_id", clientId)
      if ((existing ?? []).some((s) => key(String(s.title)) === key(title))) return `"${title}" is already one of ${first}'s steps. Say so in one line.`
      const due = DATE.test(S(input.due, 10)) ? S(input.due, 10) : ""
      const r = await act(addTask, { clientId, title, phase: stage, owner: input.owner === "client" ? "client" : "agent", due })
      return r.ok ? done(`step "${title}" added for ${first}${due ? `, due ${due}` : ""}`) : failed("Adding the step", r)
    }

    case "update_step": {
      const stepId = S(input.step_id, 60)
      const { data: step } = await db.from("steps").select("id, title").eq("id", stepId).eq("client_id", clientId).maybeSingle()
      if (!step) return "That step isn't on this client. Read client_details for the right id."
      const bits: string[] = []
      if (input.done === false) return "Reopening a step waits for the agent's yes. Use propose with reopen_step."
      if (typeof input.title === "string" && S(input.title, 160).trim()) {
        const r = await act(renameStep, { clientId, id: stepId, title: S(input.title, 160).trim() })
        if (!r.ok) return failed("Renaming the step", r)
        bits.push(`renamed to "${S(input.title, 160).trim()}"`)
      }
      if (typeof input.done === "boolean") {
        const r = await act(toggleTask, { clientId, id: stepId, done: input.done ? "1" : "0" })
        if (!r.ok) return failed("Updating the step", r)
        bits.push(input.done ? "marked done" : "reopened")
      }
      if (typeof input.due === "string") {
        const due = DATE.test(S(input.due, 10)) ? S(input.due, 10) : ""
        const r = await act(setDueDate, { clientId, id: stepId, due })
        if (!r.ok) return failed("Setting the due date", r)
        bits.push(due ? `due ${due}` : "due date cleared")
      }
      return bits.length ? done(`"${step.title}" ${bits.join(", ")}`) : "Nothing to change."
    }

    case "add_usual_steps": {
      const stage = S(input.stage, 20)
      if (!STAGE_KEYS.includes(stage as Phase)) return "Unknown stage."
      const { count } = await db.from("steps").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("phase", stage)
      if (count) return `That stage already has steps for ${first}. Say so, and offer to add a specific step instead.`
      const r = await act(addStandardSteps, { clientId, phase: stage })
      return r.ok ? done(`usual ${stageLabel(stage as Phase)} steps added for ${first}`) : failed("Adding the steps", r)
    }

    case "collect_document": {
      const title = S(input.title, 200)
      const docId = S(input.doc_id, 60)
      if (title) {
        const { data: existing } = await db.from("collected_docs").select("title").eq("client_id", clientId)
        if ((existing ?? []).some((d) => key(String(d.title)) === key(title))) return `"${title}" is already on ${first}'s list. Say so in one line.`
        const r = await act(addCollected, { clientId, title })
        return r.ok ? done(`"${title}" added to what ${first} sends you`) : failed("Adding the document", r)
      }
      if (docId && typeof input.received === "boolean") {
        const r = await act(toggleCollected, { clientId, id: docId, received: input.received ? "1" : "0" })
        return r.ok ? done(input.received ? "marked received" : "marked not received yet") : failed("Updating the document", r)
      }
      return "Ask which document."
    }

    case "save_template": {
      const title = S(input.title, 120)
      const body = S(input.body, 20000)
      const tid = S(input.template_id, 60)
      if (!title || !body) return "Ask for the template's title and wording."
      if (tid) {
        const r = await act(updateTemplate, { id: tid, title, body })
        return r.ok ? done(`template "${title}" updated`) : failed("Saving the template", r)
      }
      const { data: existing } = await db.from("document_templates").select("id, title").eq("agent_id", agentId)
      const dup = (existing ?? []).find((t) => key(String(t.title)) === key(title))
      if (dup) return `There's already a template called "${dup.title}" (id ${dup.id}). Ask whether to update that one or name the new one differently.`
      const r = await act(createTemplate, { title, body })
      return r.ok ? done(`template "${title}" created`) : failed("Creating the template", r)
    }

    case "list_templates": {
      const { data: t } = await db.from("document_templates").select("id, title").eq("agent_id", agentId)
      const { data: p } = await db.from("pdf_templates").select("id, title, kind").eq("agent_id", agentId)
      return JSON.stringify({ written: t ?? [], pdf: p ?? [] })
    }

    case "add_home": {
      const home = S(input.home, 600)
      if (!home) return "Ask for the address or listing link."
      const { data: existing } = await db.from("homes").select("id, address").eq("client_id", clientId)
      const probe = key(home.split(",")[0])
      const dup = (existing ?? []).find((h) => key(String(h.address).split(",")[0]) === probe || (probe.length > 6 && key(String(h.address)).startsWith(probe)))
      if (dup) return `${dup.address} is already on ${first}'s list. Say so in one line.`
      const r = await act2(addHome, { clientId, home })
      return r.ok ? done(`home added to ${first}'s list`) : failed("Adding the home", r)
    }

    case "update_home": {
      const homeId = S(input.home_id, 60)
      const { data: h } = await db
        .from("homes")
        .select("id, address, notes, listing_url, agent_name, agent_email, agent_phone, agent_brokerage, showing_at")
        .eq("id", homeId)
        .eq("client_id", clientId)
        .maybeSingle()
      if (!h) return "That home isn't on this client's list."
      const bits: string[] = []
      if (["notes", "listing_url", "agent_name", "agent_email", "agent_phone", "agent_brokerage", "show_date", "show_time"].some((k) => S(input[k]))) {
        const showAt = h.showing_at ? new Date(h.showing_at) : null
        const r = await act2(saveHome, {
          homeId,
          address: h.address ?? "",
          notes: S(input.notes, 4000) || h.notes || "",
          listingUrl: S(input.listing_url, 600) || h.listing_url || "",
          agentName: S(input.agent_name, 120) || h.agent_name || "",
          agentEmail: S(input.agent_email, 200) || h.agent_email || "",
          agentPhone: S(input.agent_phone, 40) || h.agent_phone || "",
          agentBrokerage: S(input.agent_brokerage, 120) || h.agent_brokerage || "",
          showDate: DATE.test(S(input.show_date, 10)) ? S(input.show_date, 10) : showAt ? formatInTimeZone(showAt, tz, "yyyy-MM-dd") : "",
          showTime: TIME.test(S(input.show_time, 5)) ? S(input.show_time, 5) : showAt ? formatInTimeZone(showAt, tz, "HH:mm") : "",
        })
        if (!r.ok) return failed("Saving the home", r)
        bits.push("updated")
      }
      if (input.status === "active" || input.status === "passed") {
        const r = await returns(setHomeStatus(homeId, input.status))
        if (!r.ok) return failed("Setting the home's status", r)
        bits.push(input.status === "passed" ? "marked passed" : "back to active")
      }
      return bits.length ? done(`${h.address} ${bits.join(" and ")}`) : "Nothing to change."
    }

    case "record_offer_answer": {
      const offerId = S(input.offer_id, 60)
      const st = S(input.status, 12)
      if (!["sent", "countered", "accepted", "declined"].includes(st)) return "Ask what the seller said."
      const r = await returns(setOfferStatus(offerId, st as "sent" | "countered" | "accepted" | "declined"))
      return r.ok ? done(`offer marked ${st}`) : failed("Recording the answer", r)
    }

    case "save_listing": {
      const { data: c } = await db.from("clients").select("sale_address, sale_price, sale_listed_on, sale_url").eq("id", clientId).maybeSingle()
      const r = await act(saveSaleHome, {
        clientId,
        address: S(input.address, 200) || c?.sale_address || "",
        price: String(N(input.price) ?? c?.sale_price ?? ""),
        listedOn: DATE.test(S(input.listed_on, 10)) ? S(input.listed_on, 10) : c?.sale_listed_on || "",
        url: S(input.url, 600) || c?.sale_url || "",
      })
      return r.ok ? done(`${first}'s listing saved`) : failed("Saving the listing", r)
    }

    case "set_private_showings": {
      const r = await act(setPrivateShowings, { clientId, on: input.private_showings ? "1" : "0" })
      return r.ok ? done(input.private_showings ? "switched to private showings" : "switched to open houses") : failed("Switching", r)
    }

    case "add_open_house": {
      const date = S(input.date, 10)
      const start = S(input.start, 5)
      const end = S(input.end, 5)
      if (!DATE.test(date) || !TIME.test(start)) return "Ask for the day and time."
      const at = fromZonedTime(`${date}T${start}:00`, tz).toISOString()
      const { data: existing } = await db.from("open_houses").select("id, starts_at").eq("client_id", clientId)
      if ((existing ?? []).some((o) => Math.abs(Date.parse(o.starts_at) - Date.parse(at)) < 30 * 60000)) return "One is already set for that day and time. Say so in one line."
      const r = await act(addOpenHouse, { clientId, kind: input.kind === "private" ? "private" : "open_house", date, start, end: TIME.test(end) ? end : "" })
      return r.ok ? done(`${input.kind === "private" ? "private showing" : "open house"} added for ${date} at ${start}`) : failed("Adding it", r)
    }

    case "open_house_feedback": {
      const r = await act(saveFeedback, { clientId, id: S(input.open_house_id, 60), feedback: S(input.feedback, 2000) })
      return r.ok ? done("feedback saved; the seller sees it in their suite") : failed("Saving the feedback", r)
    }

    case "record_offer_received": {
      const sid = S(input.sale_offer_id, 60)
      if (sid) {
        const { data: o } = await db.from("sale_offers").select("status, note").eq("id", sid).eq("client_id", clientId).maybeSingle()
        if (!o) return "That offer isn't on this client."
        const r = await act(updateSaleOffer, { clientId, id: sid, status: S(input.status, 12) || o.status, note: S(input.note, 2000) || o.note || "" })
        return r.ok ? done("offer updated") : failed("Updating the offer", r)
      }
      const amount = N(input.amount)
      if (!amount) return "Ask for the offer amount."
      const r = await act(addSaleOffer, {
        clientId,
        amount: String(amount),
        terms: S(input.terms, 300),
        note: S(input.note, 2000),
        receivedOn: DATE.test(S(input.received_on, 10)) ? S(input.received_on, 10) : "",
        buyerAgentName: S(input.buyer_agent_name, 120),
        buyerAgentEmail: S(input.buyer_agent_email, 200),
      })
      return r.ok ? done("offer recorded") : failed("Recording the offer", r)
    }

    case "add_event": {
      const kind = S(input.kind, 12)
      const date = S(input.date, 10)
      const start = S(input.start, 5)
      const end = S(input.end, 5)
      if (!DATE.test(date) || !TIME.test(start) || !TIME.test(end)) return "Ask for the day, start and end time."
      const s = fromZonedTime(`${date}T${start}:00`, tz)
      const e = fromZonedTime(`${date}T${end}:00`, tz)
      if (e <= s) return "The end time is before the start. Ask the agent to check it."
      const { data: clash } = await db.from("events").select("kind, place, starts_at").eq("agent_id", agentId).lt("starts_at", e.toISOString()).gt("ends_at", s.toISOString()).limit(1)
      if (clash?.length && !input.confirmed_overlap)
        return `That overlaps ${clash[0].kind.replace("_", " ")}${clash[0].place ? ` at ${clash[0].place}` : ""}. Ask the agent whether to add it anyway; if yes, call again with confirmed_overlap true.`
      const r =
        kind === "hold"
          ? await act(holdTime, { from: s.toISOString(), until: e.toISOString() })
          : await act(addEvent, { kind, clientId: clientId || "", place: S(input.place, 200), date, start, end })
      return r.ok ? done(`${kind === "hold" ? "personal time" : kind.replace("_", " ")} added ${date} ${start} to ${end}`) : failed("Adding it to the calendar", r)
    }

    case "list_bookings": {
      const { data: b } = await db.from("bookings").select("id, first_name, last_name, email, slot_start, meeting_type, client_id").eq("agent_id", agentId).order("slot_start", { ascending: false }).limit(15)
      const { data: r } = await db.from("card_requests").select("id, name, email, message, replied_at, client_id, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(10)
      const { data: linked } = await db.from("clients").select("booking_id").eq("agent_id", agentId).not("booking_id", "is", null)
      const isClient = new Set((linked ?? []).map((x) => x.booking_id))
      return JSON.stringify({
        bookings: (b ?? []).map((x) => ({ id: x.id, name: `${x.first_name} ${x.last_name}`, email: x.email, when: formatInTimeZone(new Date(x.slot_start), tz, "EEE MMM d, h:mm a"), how: x.meeting_type, already_a_client: isClient.has(x.id) })),
        card_requests: (r ?? []).map((x) => ({ id: x.id, name: x.name, email: x.email, message: x.message, replied: !!x.replied_at, already_a_client: !!x.client_id })),
      })
    }

    case "booking_to_client": {
      const bid = S(input.booking_id, 60)
      const { data: b } = await db.from("bookings").select("first_name, last_name, email").eq("id", bid).eq("agent_id", agentId).maybeSingle()
      if (!b) return "That booking isn't there."
      const { data: dup } = await db.from("clients").select("id, first_name, last_name").eq("agent_id", agentId).ilike("email", b.email ?? "").limit(1)
      if (dup?.length) return `${dup[0].first_name} ${dup[0].last_name} is already a client with that email. Say so, and ask whether it's the same person.`
      const r = await act(addClientFromBooking, { bookingId: bid })
      return r.ok ? done(`${b.first_name} added as a client`) : failed("Adding the client", r)
    }

    case "card_request": {
      const rid = S(input.request_id, 60)
      if (input.action === "replied") {
        const r = await returns(markReplied(rid))
        return r.ok ? done("marked replied") : failed("Marking it", r)
      }
      const { data: req } = await db.from("card_requests").select("name, email, client_id").eq("id", rid).maybeSingle()
      if (!req) return "That request isn't there."
      if (req.client_id) return "They're already a client."
      if (req.email) {
        const { data: dup } = await db.from("clients").select("first_name").eq("agent_id", agentId).ilike("email", req.email).limit(1)
        if (dup?.length) return `${dup[0].first_name} already has that email. Ask whether it's the same person.`
      }
      const r = await returns(makeClient(rid))
      return r.ok ? done(`${req.name} added as a client`) : failed("Adding the client", r)
    }

    case "inbox": {
      const { data: rows } = await db.from("clients").select("id, first_name, last_name, agent_read_at").eq("agent_id", agentId)
      const { data: msgs } = await db.from("messages").select("client_id, body, created_at, sender").eq("agent_id", agentId).eq("sender", "client").not("body", "is", null).order("created_at", { ascending: false }).limit(200)
      const readAt = new Map((rows ?? []).map((c) => [c.id, c.agent_read_at ? Date.parse(c.agent_read_at) : 0]))
      const unread = new Map<string, { count: number; last: string }>()
      for (const m of msgs ?? []) {
        if (Date.parse(m.created_at) <= (readAt.get(m.client_id) ?? 0)) continue
        const u = unread.get(m.client_id) ?? { count: 0, last: String(m.body).slice(0, 160) }
        u.count++
        unread.set(m.client_id, u)
      }
      return JSON.stringify({
        unread: [...unread.entries()].map(([cid, u]) => ({ client_id: cid, name: nameOf(ctx, cid), unread: u.count, latest: u.last })),
        note: "Say who's written in a sentence or two. Offer to draft a reply to one.",
      })
    }

    case "draft_reply": {
      const r = await draftReply(clientId).catch(() => null)
      const body = r?.text ?? ""
      if (!body) return "Couldn't draft it right now. Say so plainly."
      ctx.cards.push({ type: "message", clientId, name: nameOf(ctx, clientId), body })
      return "Drafted. " + proposed
    }

    case "draft_reminder": {
      const stepId = S(input.step_id, 60)
      const { data: step } = await db.from("steps").select("id").eq("id", stepId).eq("client_id", clientId).maybeSingle()
      if (!step) return "That step isn't on this client."
      const r = await draftReminder(stepId).catch(() => null)
      const body = r?.text ?? ""
      if (!body) return "Couldn't draft it right now. Say so plainly."
      ctx.cards.push({ type: "message", clientId, name: nameOf(ctx, clientId), body, stepId })
      return "Drafted. " + proposed
    }

    case "propose":
      return propose(ctx, input)

    case "update_settings":
      return updateSettings(ctx, input)

    case "update_card": {
      const { data: a } = await db.from("agents").select("service_areas, office_address, website_url, instagram").eq("id", agentId).maybeSingle()
      const r = await returns(
        saveCardDetails(
          S(input.areas, 120) || a?.service_areas || "",
          S(input.address, 200) || a?.office_address || "",
          S(input.website, 300) || a?.website_url || "",
          S(input.instagram, 60) || a?.instagram || "",
        ),
      )
      return r.ok ? done("card updated") : failed("Updating the card", r)
    }
  }
  return "Unknown action."
}

// ---------------------------------------------------------------- settings

async function updateSettings(ctx: Ctx, input: Record<string, unknown>): Promise<string> {
  const { db, agentId } = ctx
  const changed: string[] = []
  const bad: string[] = []
  const has = (k: string) => input[k] !== undefined && input[k] !== null && input[k] !== ""

  if (has("weekdays") || has("day_start") || has("day_end")) {
    const { data: a } = await db.from("agents").select("weekdays, day_start, day_end").eq("id", agentId).maybeSingle()
    const days = Array.isArray(input.weekdays) ? (input.weekdays as unknown[]).map(Number).filter((d) => d >= 1 && d <= 7) : a?.weekdays ?? [1, 2, 3, 4, 5]
    const start = has("day_start") ? Number(input.day_start) : a?.day_start ?? 9
    const end = has("day_end") ? Number(input.day_end) : a?.day_end ?? 17
    if (!days.length || !(start >= 0 && end <= 24 && end > start)) bad.push("hours")
    else {
      const r = await returns(saveHours(days, start, end))
      r.ok ? changed.push("booking hours") : bad.push("hours")
    }
  }
  const direct: Record<string, unknown> = {}
  if (has("slot_minutes")) [15, 20, 30, 45, 60].includes(Number(input.slot_minutes)) ? (direct.slot_minutes = Number(input.slot_minutes)) : bad.push("call length")
  if (has("days_ahead")) Number(input.days_ahead) >= 1 && Number(input.days_ahead) <= 60 ? (direct.days_ahead = Math.round(Number(input.days_ahead))) : bad.push("booking window (1 to 60 days)")
  if (has("min_notice_hours")) Number(input.min_notice_hours) >= 0 && Number(input.min_notice_hours) <= 168 ? (direct.min_notice_hours = Math.round(Number(input.min_notice_hours))) : bad.push("notice (up to 168 hours)")
  if (has("public_email")) EMAIL.test(S(input.public_email, 200)) ? (direct.public_email = S(input.public_email, 200)) : bad.push("public email")
  if (has("meeting_link")) /^https?:\/\//i.test(S(input.meeting_link, 500)) ? (direct.meeting_link = S(input.meeting_link, 500)) : bad.push("meeting link (it should start with https://)")
  if (has("tagline")) direct.tagline = S(input.tagline, 140)
  if (Object.keys(direct).length) {
    const { error } = await db.from("agents").update(direct).eq("id", agentId)
    error ? bad.push("booking settings") : changed.push("booking settings")
  }
  if (has("public_phone")) (await returns(savePhone(S(input.public_phone, 40)))).ok ? changed.push("phone") : bad.push("phone")
  if (has("business_name")) (await returns(saveBrokerage(S(input.business_name, 120)))).ok ? changed.push("brokerage") : bad.push("brokerage")
  if (has("assistant_name")) (await returns(saveAssistantName(S(input.assistant_name, 40)))).ok ? changed.push("assistant's name") : bad.push("assistant's name")
  if (has("first_name") || has("last_name")) {
    const { data: a } = await db.from("agents").select("full_name").eq("id", agentId).maybeSingle()
    const [f0, ...l0] = String(a?.full_name ?? "").split(" ")
    const r = await act2(saveAccount, { firstName: S(input.first_name, 60) || f0, lastName: S(input.last_name, 80) || l0.join(" ") })
    r.ok ? changed.push("your name") : bad.push("your name")
  }
  if (has("meeting_call_minutes") || has("meeting_inperson_minutes")) {
    const { data: a } = await db.from("agents").select("meeting_call_minutes, meeting_inperson_minutes").eq("id", agentId).maybeSingle()
    const r = await act2(saveMeetingLengths, {
      call: String(input.meeting_call_minutes ?? a?.meeting_call_minutes ?? 30),
      inPerson: String(input.meeting_inperson_minutes ?? a?.meeting_inperson_minutes ?? 60),
    })
    r.ok ? changed.push("meeting lengths") : bad.push("meeting lengths")
  }
  const nk = ["notify_messages", "notify_signed", "notify_bookings", "notify_support", "notify_hours_only"]
  if (nk.some((k) => typeof input[k] === "boolean")) {
    const { data: a } = await db.from("agents").select(nk.join(", ")).eq("id", agentId).maybeSingle()
    const cur = (a ?? {}) as unknown as Record<string, boolean>
    const v = (k: string, d: boolean) => (typeof input[k] === "boolean" ? (input[k] as boolean) : (cur[k] ?? d))
    const r = await act2(saveNotifySettings, {
      messages: v("notify_messages", true) ? "on" : undefined,
      signed: v("notify_signed", true) ? "on" : undefined,
      bookings: v("notify_bookings", true) ? "on" : undefined,
      support: v("notify_support", true) ? "on" : undefined,
      hoursOnly: v("notify_hours_only", false) ? "on" : undefined,
    })
    r.ok ? changed.push("notification switches") : bad.push("notification switches")
  }
  if (!changed.length && !bad.length) return "Nothing to change. Ask what to update."
  return `${changed.length ? `Saved: ${changed.join(", ")}.` : ""}${bad.length ? ` Didn't save: ${bad.join(", ")}. Say what to fix in one line.` : ""} Confirm in one short line.`
}

// ---------------------------------------------------------------- approvals

type Plan = { title: string; detail: string; button: string; args: Record<string, string> }

async function propose(ctx: Ctx, input: Record<string, unknown>): Promise<string> {
  const { db, agentId } = ctx
  const action = S(input.action, 30)
  const cid = S(input.client_id, 60)
  const owns = cid ? ctx.clients.some((c) => c.id === cid) : false
  const first = cid ? firstOf(ctx, cid) : ""
  const label = S(input.label, 120)
  let plan: Plan | null = null

  const needClient = () => (owns ? null : "No client with that id. Use find_client first.")

  switch (action) {
    case "send_document": {
      const miss = needClient()
      if (miss) return miss
      const tid = S(input.template_id, 60)
      const { data: t } = await db.from("document_templates").select("id, title").eq("id", tid).eq("agent_id", agentId).maybeSingle()
      if (!t) {
        // An id from the client's documents, not a template: that's a resend.
        const { data: doc } = await db.from("documents").select("id, title, status").eq("id", tid).eq("client_id", cid).maybeSingle()
        if (doc) return doc.status === "signed" ? `"${doc.title}" is signed. For a new one, propose redo_document with document_id ${doc.id} first.` : `"${doc.title}" is already out. To resend it, propose resend_document with document_id ${doc.id}.`
        return "That id isn't one of the agent's templates. Call list_templates for the right id and try again. Don't tell the agent anything is missing."
      }
      const { data: c } = await db.from("clients").select("email").eq("id", cid).maybeSingle()
      if (!c?.email) return `${first} has no email yet. Ask for it as one natural question, save it with update_client, then propose again.`
      // Every blank must have a value before anything goes for signature.
      const check = await prepareAgreement(db, agentId, cid, {}, { templateId: t.id, ignoreExisting: true })
      if (check.state === "missing") return `"${t.title}" has blanks with no value in the client file or Settings: ${check.missing.map((m) => `"${m}"`).join(", ")}. Ask the agent for them one at a time, then call prepare_agreement with client_id, template_id "${t.id}" and the blanks, so the agent reviews the filled document before it goes. Don't propose send_document for it.`
      const { data: ag } = await db.from("agents").select("broker_name, broker_email").eq("id", agentId).maybeSingle()
      const viaBroker = ag?.broker_name && ag?.broker_email ? `${ag.broker_name} co-signs next, then ` : ""
      plan = { title: `Sign and send ${t.title} to ${first}`, detail: `Your signature and today’s date go on it now. ${viaBroker ? viaBroker + first : first} gets a private signing link by email.`, button: "Sign and send", args: { clientId: cid, templateId: t.id, kind: "agreement" } }
      break
    }
    case "edit_home_address": {
      const miss = needClient()
      if (miss) return miss
      const hid = S(input.home_id, 60)
      const { data: h } = await db.from("homes").select("id, address").eq("id", hid).eq("client_id", cid).maybeSingle()
      if (!h) return "That home isn't on this client's list. Use client_file for its id."
      const clientOnly = input.client_view_only === true
      const { data: shownRow } = await db.from("homes").select("client_address").eq("id", hid).maybeSingle()
      const current = ((clientOnly ? (shownRow?.client_address as string) : "") || (h.address as string) || "").trim()
      let next = S(input.address, 200).replace(/\s+/g, " ")
      const zip = S(input.zip, 10)
      if (!next && zip) {
        if (!/^\d{5}(-\d{4})?$/.test(zip)) return "That zip doesn't look right. Ask for the five digits."
        next = /\b\d{5}(-\d{4})?\s*$/.test(current) ? current.replace(/\b\d{5}(-\d{4})?\s*$/, zip) : `${current} ${zip}`
      }
      if (next.length < 5) return "Ask for the new address, or just the part that changes."
      if (next === current) return "That's already the address. Say so in one line."
      plan = clientOnly
        ? { title: `Show ${next} on ${first}'s page`, detail: `Only what ${first} sees changes. Your records keep ${h.address}.`, button: "Update", args: { homeId: hid, address: next, clientOnly: "1" } }
        : { title: `Change ${h.address} to ${next}`, detail: `The address updates on your records, the showing and ${first}'s page.`, button: "Update", args: { homeId: hid, address: next, clientOnly: "" } }
      break
    }
    case "resend_document": {
      const miss = needClient()
      if (miss) return miss
      const did = S(input.document_id, 60)
      const { data: d } = await db.from("documents").select("id, title, status").eq("id", did).eq("client_id", cid).maybeSingle()
      if (!d) return "That document isn't on this client."
      if (d.status === "signed") return "It's already signed. Say so in one line."
      plan = d.status === "draft"
        ? { title: `Remind your broker about ${d.title}`, detail: `Your broker gets the co-signing link again. ${first} gets it to sign once it's co-signed.`, button: "Remind", args: { clientId: cid, documentId: d.id } }
        : { title: `Resend ${d.title} to ${first}`, detail: `A fresh signing link goes to ${first} by email.`, button: "Resend", args: { clientId: cid, documentId: d.id } }
      break
    }
    case "send_suite_link": {
      const miss = needClient()
      if (miss) return miss
      const { data: c } = await db.from("clients").select("email").eq("id", cid).maybeSingle()
      if (!c?.email) return `${first} has no email yet. Ask for it as one natural question, save it with update_client, then propose again.`
      plan = { title: `Send ${first} their suite link`, detail: `${first} gets an email with a private link to their suite.`, button: "Send suite link", args: { clientId: cid } }
      break
    }
    case "follow_up_offer": {
      const oid = S(input.offer_id, 60)
      const msg = S(input.message, 2000)
      const { data: o } = await db.from("home_offers").select("id, client_id, home_id, homes(address, agent_name, agent_email)").eq("id", oid).maybeSingle()
      if (!o || !ctx.clients.some((c) => c.id === o.client_id)) return "That offer isn't there."
      const h = o.homes as { address?: string; agent_name?: string; agent_email?: string } | null
      if (!h?.agent_email || !EMAIL.test(h.agent_email))
        return `The seller's agent's email isn't saved on ${h?.address ?? "that home"} (home id ${o.home_id}). Ask for ${h?.agent_name ? `${h.agent_name}'s` : "their"} email graciously, save it with update_home (agent_email), then propose the follow-up again.`
      if (!msg) return "Write a short, warm follow-up to the seller's agent in the agent's voice, then propose again with it as message."
      const addr = (o.homes as { address?: string } | null)?.address ?? "the home"
      plan = { title: `Follow up on the offer for ${addr}`, detail: msg, button: "Send follow-up", args: { offerId: oid, message: msg } }
      break
    }
    case "reopen_step": {
      const miss = needClient()
      if (miss) return miss
      const sid = S(input.step_id, 60)
      const { data: st } = await db.from("steps").select("id, title, done").eq("id", sid).eq("client_id", cid).maybeSingle()
      if (!st) return "That step isn't on this client. Read client_details for the right id."
      if (!st.done) return `"${st.title}" is already open. Say so in one line.`
      plan = {
        title: `Reopen \u201c${st.title}\u201d`,
        detail: `It goes back to open, and ${first || "the client"}'s suite shows it open again.${st.title === "Agreement signed" ? " The signed agreement stays in the file, marked Replaced." : ""}`,
        button: "Reopen",
        args: { clientId: cid, id: sid },
      }
      break
    }
    case "redo_document": {
      const miss = needClient()
      if (miss) return miss
      const did = S(input.document_id, 60)
      const { data: d } = await db.from("documents").select("id, title, status").eq("id", did).eq("client_id", cid).maybeSingle()
      if (!d) return "That document isn't on this client. Read client_details for the right id."
      if (d.status !== "signed") return "Only a signed document can be redone. Say so in one line."
      plan = {
        title: `Redo the ${d.title}`,
        detail: `This copy stays in the file, marked Replaced, and its step reopens in ${first || "the client"}'s suite until a new one is signed.`,
        button: "Redo",
        args: { clientId: cid, documentId: did },
      }
      break
    }
    case "support_message": {
      const msg = S(input.message, 4000)
      if (!msg) return "Ask what to tell Support."
      plan = { title: "Message Marvberry Support", detail: msg, button: "Send to Support", args: { body: msg } }
      break
    }
    default: {
      const del: Record<string, { table: string; idKey: string; arg: string; what: string; byClient: boolean }> = {
        delete_client: { table: "clients", idKey: "client_id", arg: "id", what: "client", byClient: false },
        delete_booking: { table: "bookings", idKey: "booking_id", arg: "id", what: "booking", byClient: false },
        delete_note: { table: "client_notes", idKey: "note_id", arg: "id", what: "note", byClient: true },
        delete_step: { table: "steps", idKey: "step_id", arg: "id", what: "step", byClient: true },
        delete_collected: { table: "collected_docs", idKey: "doc_id", arg: "id", what: "document from the list", byClient: true },
        delete_template: { table: "document_templates", idKey: "template_id", arg: "id", what: "template", byClient: false },
        remove_home: { table: "homes", idKey: "home_id", arg: "homeId", what: "home", byClient: true },
        delete_open_house: { table: "open_houses", idKey: "open_house_id", arg: "id", what: "open house", byClient: true },
        delete_sale_offer: { table: "sale_offers", idKey: "sale_offer_id", arg: "id", what: "offer", byClient: true },
        delete_event: { table: "events", idKey: "event_id", arg: "id", what: "event", byClient: false },
      }
      const d = del[action]
      if (!d) return "Unknown action."
      const target = S(input[d.idKey], 60)
      if (!target) return `Which ${d.what}? Read the file for its id.`
      if (d.byClient) {
        const miss = needClient()
        if (miss) return miss
        const { data: row } = await db.from(d.table).select("id").eq("id", target).eq("client_id", cid).maybeSingle()
        if (!row) return `That ${d.what} isn't on this client.`
      } else {
        const { data: row } = await db.from(d.table).select("id").eq("id", target).eq("agent_id", agentId).maybeSingle()
        if (!row) return `That ${d.what} isn't there.`
      }
      const name = action === "delete_client" ? nameOf(ctx, target) : label
      plan = {
        title: action === "delete_client" ? `Delete ${name}` : `Delete ${name || `this ${d.what}`}`,
        detail: action === "delete_client" ? `${name}'s file, steps, documents and messages are removed for good.` : "This can't be undone.",
        button: "Delete",
        args: { [d.arg]: target, clientId: cid, op: action },
      }
    }
  }
  if (!plan) return "Unknown action."
  ctx.cards.push({ type: "confirm", op: action, args: plan.args, title: plan.title, detail: plan.detail, button: plan.button })
  return proposed
}

// Runs an approved card. Called only from the agent's tap.
export async function runConfirmed(op: string, args: Record<string, string>): Promise<{ ok: boolean; message: string; detail?: string }> {
  const a = (k: string) => String(args[k] ?? "").slice(0, 4000)
  let r: Result = { ok: false, err: "Unknown action" }
  let ok = "Done."
  switch (op) {
    case "send_document":
      // Tapping the card is the agent's signature: they sign first, then the broker, then the client.
      r = await act(sendDocument, { clientId: a("clientId"), templateId: a("templateId"), kind: a("kind"), agentSign: "on" })
      {
        const sb = await createServerClient()
        const { data: au } = await sb.auth.getUser()
        const { data: ag } = au.user ? await sb.from("agents").select("broker_name, broker_email").eq("id", au.user.id).maybeSingle() : { data: null }
        ok = ag?.broker_name && ag?.broker_email ? `Signed. It’s with ${ag.broker_name} to co-sign, and goes to your client as soon as they do.` : "Signed and sent for signature."
      }
      break
    case "resend_document":
      r = await act(resendDocument, { clientId: a("clientId"), documentId: a("documentId") })
      ok = "Resent."
      break
    case "send_suite_link":
      r = await act(sendPortalLink, { clientId: a("clientId") })
      ok = "Suite link sent."
      break
    case "follow_up_offer":
      r = await act2(followUpOffer, { offerId: a("offerId"), message: a("message") })
      ok = "Follow-up sent."
      break
    case "support_message":
      r = await act2(sendSupportMessage, { body: a("body") })
      ok = "Sent to Support. A real person replies."
      break
    case "delete_client":
      r = await act(deleteClient, { id: a("id") })
      break
    case "delete_booking":
      r = await act(deleteBooking, { id: a("id") })
      break
    case "delete_note":
      r = await act(deleteNote, { clientId: a("clientId"), id: a("id") })
      break
    case "delete_step":
      r = await act(deleteTask, { clientId: a("clientId"), id: a("id") })
      break
    case "reopen_step":
      r = await act(reopenStep, { clientId: a("clientId"), id: a("id") })
      ok = "Reopened. Their suite shows it open again."
      break
    case "redo_document":
      r = await act(redoDocument, { clientId: a("clientId"), documentId: a("documentId") })
      ok = "Done. The old copy is marked Replaced, ready for a new one."
      break
    case "delete_collected":
      r = await act(deleteCollected, { clientId: a("clientId"), id: a("id") })
      break
    case "delete_template":
      r = await returns(deleteTemplate(a("id")))
      break
    case "remove_home":
      r = await returns(removeHome(a("homeId")))
      break
    case "edit_home_address":
      r = await returns(updateHomeAddress(a("homeId"), a("address"), a("clientOnly") === "1"))
      ok = a("clientOnly") === "1" ? "Updated what your client sees." : "Address updated."
      break
    case "delete_open_house":
      r = await act(deleteOpenHouse, { clientId: a("clientId"), id: a("id") })
      break
    case "delete_sale_offer":
      r = await act(deleteSaleOffer, { clientId: a("clientId"), id: a("id") })
      break
    case "delete_event":
      r = await act(deleteEvent, { id: a("id") })
      break
    case "send_reminder":
      r = await act(sendNudge, { stepId: a("stepId"), body: a("body"), from: "client" })
      ok = "Reminder sent."
      break
  }
  if (op.startsWith("delete_") || op === "remove_home") ok = "Deleted."
  if (r.ok) return { ok: true, message: ok }
  console.error(`[diana-ops] ${op} failed:`, r.err)
  return { ok: false, message: plainReason(op, r.err), detail: `${op} failed: ${r.err || "no reason given by the action"}` }
}

// The action's own reason, said plainly, with the fix in the same breath.
function plainReason(op: string, err?: string) {
  const e = (err ?? "").toLowerCase()
  if (/listing agent.s email|agent.s email first/.test(e)) return "The seller's agent's email isn't saved on that home yet. Add it on the home, and I'll send it straight away."
  if (/email didn.t go out|mailfail/.test(e)) return "The email didn't go out on our side. Tap again in a minute, and it should send."
  if (/sign in/.test(e)) return "Your session ended. Sign in again, then tap once more."
  if (/gone|refresh/.test(e)) return "That's no longer there. Refresh the page, and I'll pick it up from there."
  if (/noemail|no email|their email/.test(e)) return "They don't have an email yet. Add it on their file, and I'll send it."
  if (err && err.length < 140 && /[a-z]/i.test(err) && !/[{}\[\]]|error:|exception/i.test(err)) return err
  return op === "follow_up_offer" || op.startsWith("send") || op.startsWith("resend")
    ? "That didn't send. Tap again in a moment; if it still won't go, it can be sent from the client's page."
    : "That didn't go through. Tap again in a moment; if it still won't, it can be done on the page."
}

export const journeyOfStage = journeyOf
