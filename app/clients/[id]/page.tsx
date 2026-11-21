import { customBlanks, type PdfField } from "@/lib/pdf-fields"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import JacketDetails from "./jacket-details"
import JacketTabs from "./jacket-tabs"
import Homes, { type HomeView } from "./homes"
import type { OfferView } from "./offer-forms"
import { movePhase } from "./checklist-actions"
import { daysUntil, agentDueLabel } from "@/lib/due"
import { formatInTimeZone } from "date-fns-tz"
import DocumentsPanel from "./documents-panel"
import SendDocument from "./send-document"
import { resendDocument } from "./actions"
import Composer from "./composer"
import { assistantFor } from "@/lib/assistant"
import { aiPrefsFor } from "@/lib/ai-prefs"
import { sendPortalLink } from "./portal-actions"
import LeftColumn, { type Task, type Collected } from "./left-column"
import DealPanel, { type Offer, type Note } from "./deal-panel"
import { phasesFor, stageLabel, phaseIndex, toBuyPhase, toSellPhase, toOwner, OWNER_LABEL, type Phase } from "@/lib/phases"
import { journeysFor, suiteName } from "@/lib/suite"
import { toggleTask } from "./checklist-actions"
import SellerTools, { type OpenHouse, type SaleOffer } from "./seller-tools"
import { agreementAuto, toAgreementSettings } from "@/lib/agreement"

export const dynamic = "force-dynamic"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  client_type: string | null
  budget_min: number | null
  budget_max: number | null
  phase: string | null
  portal_token: string | null
}

type Message = {
  id: string
  created_at: string
  sender: "agent" | "client"
  body: string | null
  document_id: string | null
}

type Doc = {
  id: string
  title: string
  status: string
  signer_name: string | null
  signed_at: string | null
}

const BANNERS: Record<string, { text: string; ok: boolean }> = {
  sent: { text: "Sent. The client got a private signing link by email.", ok: true },
  resent: { text: "Signing link sent again.", ok: true },
  noemail: {
    text: "The document is in the thread, but this client has no email. Add one in Details, then hit Resend.",
    ok: false,
  },
  mailfail: {
    text: "The document is in the thread, but the email didn't go out. Try Resend.",
    ok: false,
  },
  portalsent: { text: "Suite link sent. Your client can open their suite from the email.", ok: true },
  portalnoemail: { text: "This client has no email. Add one in Details, then send the suite link.", ok: false },
  portalfail: { text: "The suite link email didn't go out. Please try again.", ok: false },
}

const ERRORS: Record<string, string> = {
  doc: "Couldn't create the document. Please try again.",
  blanks: "Fill in every blank before sending.",
  msg: "Couldn't send that message. Please try again.",
  task: "Couldn't update that task. Please try again.",
  collected: "Couldn't update that document. Please try again.",
  deal: "Couldn't save the buying range. Please try again.",
  offer: "Couldn't save that offer. Add a property address and try again.",
  note: "Couldn't save that note. Please try again.",
  phase: "Couldn't change the phase. Please try again.",
  seller: "Couldn't save that. If this keeps happening, the seller tools may still be switching on.",
  openhouse: "Couldn't save that open house. Add a date and a start time and try again.",
  saleoffer: "Couldn't save that offer. Add an amount and try again.",
}

function initials(first: string, last: string) {
  const i = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase()
  return i || "?"
}

export default async function ClientJacket({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string; doc?: string; error?: string; step?: string; nudge?: string; tab?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: agentData } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, address, created_at, client_type, budget_min, budget_max, phase, portal_token")
    .eq("id", id)
    .maybeSingle()
  const client = data as Client | null
  if (!client) notFound()

  // Homes this buyer is looking at (blank until homes.sql is run).
  const { data: homeData } = await supabase
    .from("homes")
    .select("id, address, listing_url, agent_name, agent_brokerage, agent_email, agent_phone, notes, status, showing_at")
    .eq("client_id", id)
    .order("created_at", { ascending: true })
  const homeTz = agent.timezone || "America/New_York"
  // Latest offer per home (blank until home-offers.sql is run).
  const { data: offerRows } = await supabase
    .from("home_offers")
    .select("id, home_id, amount, status, created_at, good_until, followed_up_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
  const ai = await aiPrefsFor(supabase, user.id)
  const latestOffer = new Map<string, OfferView>()
  for (const o of (offerRows ?? []) as Record<string, string | number | null>[]) {
    if (latestOffer.has(o.home_id as string)) continue
    const good = o.good_until ? new Date(o.good_until as string) : null
    latestOffer.set(o.home_id as string, {
      id: o.id as string,
      amount: `$${Math.round(Number(o.amount)).toLocaleString("en-US")}`,
      sentLabel: formatInTimeZone(new Date(o.created_at as string), homeTz, "EEEE"),
      goodLabel: good ? formatInTimeZone(good, homeTz, "EEEE 'at' h:mm a").replace(":00 ", " ") : "",
      status: (["sent", "countered", "accepted", "declined"].includes(o.status as string) ? o.status : "sent") as OfferView["status"],
      // Flag it once it's within a day of running out (or past).
      soon: ai.offerNudges && !!good && good.getTime() - Date.now() < 24 * 60 * 60 * 1000,
      followedUp: !!o.followed_up_at,
    })
  }
  // What the client wrote and tapped on their own page (blank until homes-client.sql is run).
  const { data: theirRows, error: theirErr } = await supabase.from("homes").select("id, client_notes, client_offer_at").eq("client_id", id)
  const theirs = new Map(
    (theirErr ? [] : ((theirRows ?? []) as { id: string; client_notes: string | null; client_offer_at: string | null }[])).map((r) => [r.id, r]),
  )
  const homes: HomeView[] = ((homeData ?? []) as Record<string, string | null>[]).map((h) => ({
    id: h.id as string,
    address: (h.address as string) || "",
    listingUrl: h.listing_url || "",
    agentName: h.agent_name || "",
    agentBrokerage: h.agent_brokerage || "",
    agentEmail: h.agent_email || "",
    agentPhone: h.agent_phone || "",
    notes: h.notes || "",
    status: h.status === "passed" ? "passed" : "active",
    showDate: h.showing_at ? formatInTimeZone(new Date(h.showing_at), homeTz, "yyyy-MM-dd") : "",
    showTime: h.showing_at ? formatInTimeZone(new Date(h.showing_at), homeTz, "HH:mm") : "",
    showLabel: h.showing_at
      ? formatInTimeZone(new Date(h.showing_at), homeTz, "EEEE, MMMM d 'at' h:mm a").replace(":00 ", " ")
      : "",
    shown: h.showing_at ? new Date(h.showing_at).getTime() < Date.now() : false,
    offer: latestOffer.get(h.id as string) ?? null,
    clientNotes: theirs.get(h.id as string)?.client_notes || "",
    clientAsked: theirs.get(h.id as string)?.client_offer_at
      ? formatInTimeZone(new Date(theirs.get(h.id as string)!.client_offer_at!), homeTz, "EEEE")
      : "",
  }))

  const [
    { data: msgData },
    { data: docData },
    { data: tplData },
    { data: taskData },
    { data: colData },
    { data: offerData },
    { data: noteData },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("id, created_at, sender, body, document_id")
      .eq("client_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("documents")
      .select("id, title, status, signer_name, signed_at")
      .eq("client_id", id),
    supabase
      .from("document_templates")
      .select("id, title, body")
      .order("created_at", { ascending: true }),
    supabase
      .from("steps")
      .select("id, title, done, phase, owner, due_on, nudged_at")
      .eq("client_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("collected_docs")
      .select("id, title, received, file_path")
      .eq("client_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("offers")
      .select("id, property_address, amount, other_agent_name, other_agent_email")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_notes")
      .select("id, body, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ])
  const messages = (msgData ?? []) as Message[]
  const assistant = await assistantFor(supabase, user.id)
  const docs = new Map(((docData ?? []) as Doc[]).map((d) => [d.id, d]))
  const templates = (tplData ?? []) as { id: string; title: string; body: string }[]
  // Seller fields live in their own columns. Read them apart so the page
  // still opens before suites.sql has been run.
  const { data: sellRow } = await supabase
    .from("clients")
    .select("sell_phase, sale_address, sale_price, sale_listed_on, sale_url, private_showings")
    .eq("id", client.id)
    .maybeSingle()
  const sell = (sellRow ?? {}) as {
    sell_phase?: string | null
    sale_address?: string | null
    sale_price?: number | null
    sale_listed_on?: string | null
    sale_url?: string | null
    private_showings?: boolean | null
  }
  // Has the suite link gone out? Read apart: the column arrives with suite-sent.sql.
  const { data: sentRow, error: sentErr } = await supabase.from("clients").select("portal_sent_at").eq("id", client.id).maybeSingle()
  const linkSent = sentErr ? !!client.portal_token : !!(sentRow as { portal_sent_at?: string | null } | null)?.portal_sent_at
  const journeys = journeysFor(client.client_type)
  const buyPhase = toBuyPhase(client.phase)
  const sellPhase = toSellPhase(sell.sell_phase)
  const allTasks = (taskData ?? []) as (Task & { phase: string | null })[]
  const buyTasks = allTasks.filter((t) => (t.phase ?? "showing") === buyPhase)
  const sellTasks = allTasks.filter((t) => t.phase === sellPhase)
  const phase: Phase = journeys[0] === "sell" ? sellPhase : buyPhase
  const tasks = journeys[0] === "sell" ? sellTasks : buyTasks
  const privateShowings = !!sell.private_showings
  const isSeller = journeys.includes("sell")
  const [{ data: ohRows }, { data: soRows }] = isSeller
    ? await Promise.all([
        supabase.from("open_houses").select("id, starts_at, ends_at, kind, feedback").eq("client_id", client.id).order("starts_at", { ascending: true }),
        supabase.from("sale_offers").select("id, amount, terms, status, note, received_on").eq("client_id", client.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]
  const collected = (colData ?? []) as Collected[]
  const offers = (offerData ?? []) as Offer[]
  const notes = (noteData ?? []) as Note[]
  // The agent's own PDF offer forms. Skipped quietly if the table isn't there yet.
  const { data: formRows } = await supabase.from("pdf_templates").select("id, title, fields").eq("kind", "offer").order("created_at")
  const pdfForms = ((formRows ?? []) as { id: string; title: string; fields: PdfField[] | null }[]).map((f) => ({
    id: f.id,
    title: f.title,
    custom: customBlanks(f.fields ?? []),
  }))

  const name = `${client.first_name} ${client.last_name}`.trim() || "Client"
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: agent.timezone || "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  const fmtDay = new Intl.DateTimeFormat("en-US", {
    timeZone: agent.timezone || "America/New_York",
    month: "short",
    day: "numeric",
  })

  const banner = sp.doc ? BANNERS[sp.doc] : undefined
  const error = sp.error ? ERRORS[sp.error] : undefined

  const { data: agreementRow } = await supabase
    .from("agents")
    .select("agreement_days, agreement_exclusive")
    .eq("id", user.id)
    .maybeSingle()
  const agreementFill = agreementAuto(toAgreementSettings(agreementRow), agent.timezone)
  const { data: commissionRow } = await supabase.from("agents").select("default_commission").eq("id", user.id).maybeSingle()
  const defaultCommission = ((commissionRow as { default_commission?: string } | null)?.default_commission ?? "").trim()

  const todayLong = new Intl.DateTimeFormat("en-US", {
    timeZone: agent.timezone || "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date())

  return (
    <AppShell agent={agent}>
      <main className="flex flex-col bg-white">
        {/* Client header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-lxhair px-5 py-4 sm:flex-nowrap sm:px-6">
          <Link
            href="/clients"
            className="order-first basis-full text-xs text-lxsoft underline-offset-2 hover:text-lxink hover:underline sm:order-last sm:basis-auto"
          >
            &larr; All clients
          </Link>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lxfill font-serif font-semibold tracking-tight text-base text-lxink">
            {initials(client.first_name, client.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-[15px]">{name}</h1>
            <p className="truncate text-xs text-lxsoft">{client.phone || client.email || "\u00a0"}</p>
          </div>
          {/* Actions: their own full-width row on phones, inline on desktop */}
          <div className="flex w-full items-center gap-3 sm:w-auto">
            {/* One dark button: this client's next action. */}
            {(() => {
              const j = journeys[0]
              const cur = j === "sell" ? sellPhase : buyPhase
              const list = phasesFor(j) as { key: Phase; label: string }[]
              const nxt = list[list.findIndex((p) => p.key === cur) + 1]
              const dark = "w-full rounded-[2px] border border-lxink bg-lxink px-3.5 py-2.5 text-sm text-lxbg transition-opacity hover:opacity-90 sm:w-auto sm:py-2 sm:text-xs"
              const outline = "w-full rounded-[2px] border border-lxink bg-transparent px-3.5 py-2.5 text-sm text-lxink transition-colors hover:bg-lxink/[0.04] sm:w-auto sm:py-2 sm:text-xs"
              return (
                <>
                  <form action={sendPortalLink} className="flex-1 sm:order-last sm:flex-none">
                    <input type="hidden" name="clientId" value={client.id} />
                    <button type="submit" className={linkSent ? outline : dark}>
                      Send suite link
                    </button>
                  </form>
                  {linkSent && nxt && (
                    <form action={movePhase} className="flex-1 sm:order-last sm:flex-none">
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="to" value={nxt.key} />
                      <button type="submit" className={dark}>
                        Move to {stageLabel(nxt.key, privateShowings)}
                      </button>
                    </form>
                  )}
                </>
              )
            })()}
            {client.portal_token && (
              <a
                href={`/portal/${client.portal_token}`}
                target="_blank"
                rel="noopener"
                className="shrink-0 rounded-[10px] border border-lxhair px-3.5 py-2.5 text-sm text-lxsoft hover:text-lxink sm:border-0 sm:px-0 sm:py-0 sm:text-xs sm:underline-offset-2 sm:hover:underline"
              >
                Preview suite
              </a>
            )}
          </div>
        </div>

        {/* Stage trackers: one per journey */}
        {journeys.map((j) => {
          const cur = j === "sell" ? sellPhase : buyPhase
          const list = phasesFor(j) as { key: Phase; label: string }[]
          const ci = phaseIndex(cur)
          return (
            <div key={j} className="border-b border-lxhair bg-lxfill px-6 py-4">
              {journeys.length > 1 && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-lxsoft">{j === "sell" ? "Selling" : "Buying"}</p>
              )}
              <div className="flex items-center">
                {list.map((p, idx) => {
                  const state = idx < ci ? "done" : idx === ci ? "now" : "later"
                  const label = stageLabel(p.key, privateShowings)
                  return (
                    <div key={p.key} className={`flex items-center ${idx < list.length - 1 ? "flex-1" : ""}`}>
                      <form action={movePhase}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="to" value={p.key} />
                        <button
                          type="submit"
                          disabled={state === "now"}
                          title={state === "now" ? undefined : `Move ${client.first_name || "this client"} to ${label}`}
                          className="group flex items-center gap-2.5 rounded-full py-1 pr-2 enabled:cursor-pointer enabled:hover:bg-white"
                        >
                          <span
                            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold ${
                              state === "done"
                                ? "border-lxgold bg-lxgold text-white"
                                : state === "now"
                                  ? "border-lxink bg-lxink text-white"
                                  : "border-lxhair bg-white text-lxsoft"
                            }`}
                          >
                            {state === "done" ? "\u2713" : idx + 1}
                          </span>
                          <span className={`text-[13px] ${state === "now" ? "font-semibold" : state === "done" ? "" : "text-lxsoft"}`}>
                            {label}
                          </span>
                        </button>
                      </form>
                      {idx < list.length - 1 && <div className={`mx-3 h-[1.5px] flex-1 ${idx < ci ? "bg-lxgold" : "bg-[#d3d2d5]"}`} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Now: the current stage's steps, open at the top. */}
        <section className="border-b border-lxhair bg-white px-6 py-5">
          <div className={`grid gap-8 ${journeys.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {journeys.map((j) => {
              const cur = j === "sell" ? sellPhase : buyPhase
              const rows = j === "sell" ? sellTasks : buyTasks
              const tzz = agent.timezone || "America/New_York"
              return (
                <div key={j}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="m-0 text-[13px] text-lxsoft">
                      {journeys.length > 1 ? (j === "sell" ? "Selling \u00b7 " : "Buying \u00b7 ") : "Now \u00b7 "}
                      <span className="font-lux text-[19px] italic text-lxink">{stageLabel(cur, privateShowings)}</span>
                    </p>
                    <Link href={`/clients/${client.id}?tab=tasks`} className="text-[12.5px] text-lxink no-underline [border-bottom:1px_solid_#C2A46B]">
                      All steps and documents
                    </Link>
                  </div>
                  {rows.length === 0 ? (
                    <p className="mt-2 text-sm text-lxsoft">
                      No steps here yet. Add them in <Link href={`/clients/${client.id}?tab=tasks`} className="text-lxink no-underline [border-bottom:1px_solid_#C2A46B]">all steps</Link>.
                    </p>
                  ) : (
                    <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                      {rows.map((t) => (
                        <li key={t.id} className="flex items-start gap-2.5 border-b border-lxhair py-2.5">
                          <form action={toggleTask}>
                            <input type="hidden" name="clientId" value={client.id} />
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                            <button
                              type="submit"
                              aria-label={t.done ? `Mark ${t.title} not done` : `Mark ${t.title} done`}
                              className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none ${
                                t.done ? "border-lxgold bg-lxgold text-white" : "border-lxgold/60 bg-transparent"
                              }`}
                            >
                              {t.done ? "\u2713" : ""}
                            </button>
                          </form>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm ${t.done ? "text-lxsoft line-through" : "text-lxink"}`}>{t.title}</span>
                            {!t.done && (
                              <span className="block text-xs text-lxsoft">
                                {OWNER_LABEL[toOwner(t.owner)]}
                                {t.due_on ? ` \u00b7 ${agentDueLabel(t.due_on, tzz)}` : ""}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {homeData && journeys.includes("buy") && (() => {
          const homesEl = (
            <Homes
              clientId={client.id}
              clientFirst={client.first_name || ""}
              clientFull={`${client.first_name || ""} ${client.last_name || ""}`.trim()}
              homes={homes}
              docs={collected.filter((c) => c.file_path).map((c) => ({ id: c.id, title: c.title }))}
              forms={pdfForms}
            />
          )
          // Past Offer, the homes fold away; one click opens them.
          const pastOffer = phaseIndex(buyPhase) > phaseIndex("offer")
          return pastOffer ? (
            <details className="group border-b border-lxhair bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span>Homes <span className="text-lxsoft">{"\u00b7"} {homes.length}</span></span>
                <span className="text-lxsoft group-open:hidden">Show</span>
                <span className="hidden text-lxsoft group-open:inline">Hide</span>
              </summary>
              {homesEl}
            </details>
          ) : homesEl
        })()}

        <JacketTabs
          initial={sp.step || sp.tab === "tasks" ? "tasks" : undefined}
          late={tasks.filter((t) => !t.done && t.due_on && daysUntil(t.due_on, agent.timezone || "America/New_York") < 0).length}
          summary={(() => {
            const now = tasks
            const doneN = now.filter((t) => t.done).length
            const got = collected.filter((c) => c.received).length
            const label = stageLabel(phase, privateShowings)
            return [
              now.length ? `${label}: ${doneN} of ${now.length} steps done` : "",
              collected.length ? `${got} of ${collected.length} documents in` : "",
            ].filter(Boolean).join(" \u00b7 ")
          })()}
          documents={<DocumentsPanel clientId={client.id} collected={collected} />}
          tasks={<>
            {journeys.map((j) => (
              <div key={j} className={j === journeys[0] ? "" : "mt-6"}>
                <LeftColumn
                  clientId={client.id}
                  firstName={client.first_name}
                  tz={agent.timezone || "America/New_York"}
                  focus={sp.step}
                  nudge={sp.nudge}
                  canEmail={!!client.email}
                  agentFirst={(agent.full_name || "").trim().split(/\s+/)[0] || ""}
                  missingDocs={collected.filter((c) => !c.received).length}
                  collected={collected}
                  assistant={assistant.unlocked && ai.reminders}
                  phase={j === "sell" ? sellPhase : buyPhase}
                  tasks={j === "sell" ? sellTasks : buyTasks}
                  privateShowings={privateShowings}
                  suite={suiteName(client.client_type)}
                  heading={journeys.length > 1 ? (j === "sell" ? "Selling" : "Buying") : undefined}
                />
                {j === "sell" && (
                  <SellerTools
                    clientId={client.id}
                    firstName={client.first_name || ""}
                    home={{ address: sell.sale_address ?? null, price: sell.sale_price ?? null, listedOn: sell.sale_listed_on ?? null, url: sell.sale_url ?? null }}
                    privateShowings={privateShowings}
                    openHouses={(ohRows ?? []) as OpenHouse[]}
                    offers={(soRows ?? []) as SaleOffer[]}
                    tz={agent.timezone || "America/New_York"}
                  />
                )}
              </div>
            ))}
          </>}
          messages={<>
            {(sp.updated || banner || error) && (
              <div className="space-y-2 px-6 pt-4">
                {sp.updated && (
                  <p className="rounded-lg bg-lxlav/50 px-4 py-2.5 text-sm text-lxgold">Client updated.</p>
                )}
                {banner && (
                  <p
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                      banner.ok ? "bg-lxlav/50 text-lxgold" : "bg-lxfill text-lxink"
                    }`}
                  >
                    {banner.text}
                  </p>
                )}
                {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800">{error}</p>}
              </div>
            )}

            {/* Newest at the bottom; column-reverse keeps the view pinned there */}
            <div className="flex flex-1 flex-col-reverse overflow-y-auto">
              <div className="flex flex-col gap-1 px-6 py-6">
                {messages.length === 0 && (
                  <p className="m-auto max-w-xs py-16 text-center text-sm text-lxsoft">
                    Nothing here yet. Send the agreement to get started.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "agent"
                  const doc = m.document_id ? docs.get(m.document_id) : undefined
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {doc ? (
                        <div className="w-full max-w-sm rounded-2xl rounded-br-[5px] border border-lxhair bg-white px-4 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.04)]">
                          <p className="text-[10px] uppercase tracking-[0.09em] text-lxsoft">
                            Document to sign
                          </p>
                          <p className="mt-1 font-serif font-semibold tracking-tight text-xl">{doc.title}</p>
                          <div className="mt-3 flex items-center gap-3">
                            {doc.status === "signed" ? (
                              <span className="rounded-full bg-lxlav/50 px-2.5 py-0.5 text-[11px] text-lxgold">
                                Signed{doc.signed_at ? ` \u00b7 ${fmtDay.format(new Date(doc.signed_at))}` : ""}
                                {doc.signer_name ? ` by ${doc.signer_name}` : ""}
                              </span>
                            ) : (
                              <>
                                <span className="rounded-full bg-lxfill px-2.5 py-0.5 text-[11px] text-lxink">
                                  Sent &middot; waiting
                                </span>
                                <form action={resendDocument}>
                                  <input type="hidden" name="documentId" value={doc.id} />
                                  <input type="hidden" name="clientId" value={client.id} />
                                  <button className="text-xs text-lxsoft underline hover:text-lxink">
                                    Resend
                                  </button>
                                </form>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[74%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            mine ? "rounded-br-[5px] bg-[#eeedeb]" : "rounded-bl-[5px] bg-lxfill"
                          }`}
                        >
                          {m.body}
                        </div>
                      )}
                      <span className="mx-1 mb-3 mt-1 text-[11px] text-[#8f8b84]">
                        {fmt.format(new Date(m.created_at))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-lxhair px-6 py-4">
              <div className="mb-3">
                <SendDocument
                  clientId={client.id}
                  defaultCommission={defaultCommission}
                  templates={templates}
                  auto={{
                    "client name": `${client.first_name} ${client.last_name}`.trim(),
                    "client first name": client.first_name ?? "",
                    "client last name": client.last_name ?? "",
                    "client address": client.address ?? "",
                    "client email": client.email ?? "",
                    "client phone": client.phone ?? "",
                    "agent name": agent.full_name ?? "",
                    brokerage: agent.business_name ?? "",
                    "business name": agent.business_name ?? "",
                    date: todayLong,
                    "today's date": todayLong,
                    ...agreementFill,
                  }}
                />
              </div>
              <Composer
                clientId={client.id}
                clientFirst={client.first_name ?? ""}
                canDraft={assistant.unlocked && ai.replies && messages.length > 0 && messages[messages.length - 1].sender === "client"}
              />
              <p className="mt-2 text-[11px] text-[#8f8b84]">
                {client.first_name || "Your client"} sees these messages in their suite and can reply there.
              </p>
            </div>
          </>}
          client={<>
            <JacketDetails client={client} />
            <DealPanel
              clientId={client.id}
              clientType={client.client_type}
              budgetMin={client.budget_min}
              budgetMax={client.budget_max}
              offers={offers}
              notes={notes}
              timezone={agent.timezone}
            />
          </>}
        />
      </main>
    </AppShell>
  )
}
