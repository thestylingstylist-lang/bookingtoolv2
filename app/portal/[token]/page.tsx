import "../../suite-fonts"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  BUY_PHASES,
  SELL_PHASES,
  stageLabel,
  toBuyPhase,
  toSellPhase,
  toOwner,
  OWNER_LABEL_CLIENT,
  type Phase,
  type Journey,
  type StepDef,
} from "@/lib/phases"
import { clientDueLabel } from "@/lib/due"
import { clientWording } from "@/lib/client-wording"
import { journeysFor, suiteName } from "@/lib/suite"
import { clientSendMessage } from "./actions"
import UploadButton from "./upload-button"
import PortalTabs from "./portal-tabs"
import PortalHomes, { type PortalHome } from "./portal-homes"
import { AgentHeader, SuiteFooter, Tracker, Tag, DotLabel, H2, BTN, OUTLINE, QUIET, HAIR, LINE, type TagColor } from "../../suite-ui"

export const dynamic = "force-dynamic"
const BASE_META = { title: "Your suite", robots: { index: false, follow: false } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Step = { id: string; title: string; done: boolean; phase: string | null; owner: string | null; due_on: string | null }
type OpenHouse = { id: string; starts_at: string; ends_at: string | null; kind: string; feedback: string | null }
type SaleOffer = { id: string; amount: number; terms: string | null; status: string; note: string | null; received_on: string | null }
type Stage = { key: Phase; label: string; steps: StepDef[] }

const OFFER_TAG: Record<string, { text: string; color: TagColor }> = {
  review: { text: "Under review", color: "blue" },
  countered: { text: "Countered", color: "lav" },
  accepted: { text: "Accepted", color: "sage" },
  declined: { text: "Declined", color: "sage" },
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!UUID_RE.test(token)) return BASE_META
  const { data } = await createAdminClient().from("clients").select("client_type").eq("portal_token", token).maybeSingle()
  const name = suiteName(data?.client_type)
  return { title: `Your ${name}`, robots: { index: false, follow: false } }
}

export default async function Portal({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  if (!UUID_RE.test(token)) notFound()

  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("id, agent_id, first_name, phase, client_type")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) notFound()

  const journeys = journeysFor(client.client_type)
  const selling = journeys.includes("sell")
  const buying = journeys.includes("buy")

  const [{ data: agent }, { data: stepData }, { data: docData }, { data: colData }, { data: msgData }, { data: sellRow }] =
    await Promise.all([
      admin.from("agents").select("full_name, business_name, timezone").eq("id", client.agent_id).maybeSingle(),
      admin
        .from("steps")
        .select("id, title, done, phase, owner, due_on")
        .eq("client_id", client.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      admin.from("documents").select("id, title, status, signed_at").eq("client_id", client.id).order("created_at", { ascending: true }),
      admin.from("collected_docs").select("id, title, received, file_path").eq("client_id", client.id).order("created_at", { ascending: true }),
      admin
        .from("messages")
        .select("id, created_at, sender, body")
        .eq("client_id", client.id)
        .not("body", "is", null)
        .order("created_at", { ascending: true }),
      // Seller fields read apart, so the page still opens before suites.sql has run.
      selling
        ? admin
            .from("clients")
            .select("sell_phase, sale_address, sale_price, sale_listed_on, sale_url, private_showings")
            .eq("id", client.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])
  const sell = (sellRow ?? {}) as {
    sell_phase?: string | null
    sale_address?: string | null
    sale_price?: number | null
    sale_listed_on?: string | null
    sale_url?: string | null
    private_showings?: boolean | null
  }

  const [{ data: ohData }, { data: soData }] = selling
    ? await Promise.all([
        admin.from("open_houses").select("id, starts_at, ends_at, kind, feedback").eq("client_id", client.id).order("starts_at", { ascending: true }),
        admin.from("sale_offers").select("id, amount, terms, status, note, received_on").eq("client_id", client.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]
  const openHouses = (ohData ?? []) as OpenHouse[]
  const saleOffers = (soData ?? []) as SaleOffer[]

  const agentName = agent?.full_name || agent?.business_name || "Your agent"
  const agentFirst = (agent?.full_name || "").trim().split(/\s+/)[0] || "Your agent"
  const tz = agent?.timezone || "America/New_York"
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" })
  const privateShowings = !!sell.private_showings

  // ---- Journeys: stages, the current one, and each stage's steps ----
  const allSteps = (stepData ?? []) as Step[]
  const buyCur = toBuyPhase(client.phase)
  const sellCur = toSellPhase(sell.sell_phase)
  const current = (j: Journey): Phase => (j === "sell" ? sellCur : buyCur)
  const stagesOf = (j: Journey): Stage[] =>
    (j === "sell" ? SELL_PHASES : BUY_PHASES).map((p) => ({ key: p.key, label: stageLabel(p.key, privateShowings), steps: p.steps }))
  // Steps saved before stages existed count as Showing.
  const stepsIn = (key: Phase) => allSteps.filter((s) => (s.phase ?? "showing") === key)
  const nowSteps = journeys.flatMap((j) => stepsIn(current(j)).map((s) => ({ ...s, journey: j })))

  const signed = (docData ?? []).filter((d) => d.status === "signed")
  const toSign = (docData ?? []).filter((d) => d.status !== "signed")
  const collected = colData ?? []
  const missing = collected.filter((d) => !d.received)
  const messages = msgData ?? []

  // ---- Homes their agent is showing them (buying) ----
  let homes: PortalHome[] = []
  if (buying) {
    const { data: homeRows } = await admin
      .from("homes")
      .select("id, address, listing_url, showing_at, status")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })
    const { data: mineRows, error: mineErr } = await admin.from("homes").select("id, client_notes, client_offer_at").eq("client_id", client.id)
    const theirs = new Map(
      (mineErr ? [] : ((mineRows ?? []) as { id: string; client_notes: string | null; client_offer_at: string | null }[])).map((r) => [r.id, r]),
    )
    const { data: offerRows } = await admin
      .from("home_offers")
      .select("home_id, amount, status, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
    const latest = new Map<string, PortalHome["offer"]>()
    for (const o of (offerRows ?? []) as { home_id: string; amount: number; status: string; created_at: string }[]) {
      if (latest.has(o.home_id)) continue
      latest.set(o.home_id, {
        amount: `$${Math.round(Number(o.amount)).toLocaleString("en-US")}`,
        sentLabel: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(new Date(o.created_at)),
        status: (["sent", "countered", "accepted", "declined"].includes(o.status) ? o.status : "sent") as "sent",
      })
    }
    const showFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    homes = ((homeRows ?? []) as { id: string; address: string; listing_url: string | null; showing_at: string | null; status: string }[])
      .filter((h) => h.status !== "passed")
      .map((h) => {
        const [street, ...rest] = (h.address || "").split(",")
        const t = theirs.get(h.id)
        return {
          id: h.id,
          street: street.trim(),
          town: rest.join(",").trim(),
          listingUrl: h.listing_url || "",
          showing: h.showing_at ? showFmt.format(new Date(h.showing_at)).replace(/, (\d+:\d+)/, " at $1").replace(":00 ", " ") : "",
          shown: h.showing_at ? new Date(h.showing_at).getTime() < Date.now() : false,
          notes: t?.client_notes || "",
          askedLabel: t?.client_offer_at ? new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(new Date(t.client_offer_at)) : "",
          offer: latest.get(h.id) ?? null,
        }
      })
  }

  // ---- The next step, and its one dark button ----
  const mine = nowSteps.find((s) => !s.done && toOwner(s.owner) === "client")
  const waiting = nowSteps.find((s) => !s.done)
  const reviewing = saleOffers.filter((o) => o.status === "review")
  const offersNow = selling && sellCur === "offers" && reviewing.length > 0
  const forWhich = (j: Journey) => (journeys.length > 1 ? (j === "sell" ? "For your sale." : "For your purchase.") : "")
  let nextTitle: string
  let nextSub = ""
  let action: { label: string; href: string } | null = null
  if (mine) {
    nextTitle = clientWording(mine.title, agentFirst)
    nextSub = [forWhich(mine.journey), mine.due_on ? clientDueLabel(mine.due_on, tz) + "." : ""].filter(Boolean).join(" ")
    const docStep = /document|funds|pre-approval|statement|letter/i.test(mine.title)
    action = missing.length > 0 && docStep ? { label: "Upload documents", href: "#documents" } : { label: `Message ${agentFirst}`, href: "#messages" }
  } else if (offersNow) {
    nextTitle = reviewing.length === 1 ? "Review your offer" : `Review your ${WORDS[reviewing.length]?.toLowerCase() ?? reviewing.length} offers`
    nextSub = `${agentFirst}’s notes are with each one.`
    action = { label: reviewing.length === 1 ? "Review the offer" : "Review offers", href: "#offers" }
  } else if (waiting) {
    nextTitle = clientWording(waiting.title, agentFirst)
    nextSub = [forWhich(waiting.journey), "Nothing is needed from you."].filter(Boolean).join(" ")
  } else {
    nextTitle = "You’re all caught up"
    nextSub = `${agentFirst} will be in touch about what comes next.`
  }
  const messageIsAction = action?.href === "#messages"

  const firstName = client.first_name?.trim() || ""
  const suite = suiteName(client.client_type)
  const what = buying && selling ? "your sale and your purchase stand" : selling ? "your sale stands" : "your home search stands"

  // ---- Pieces ----
  const tagFor = (s: Step) => {
    const owner = toOwner(s.owner)
    if (owner === "client") return <Tag color="blush">Your turn</Tag>
    if (owner === "agent") return <Tag color="blue">{agentFirst}</Tag>
    return <Tag color="lav">{OWNER_LABEL_CLIENT[owner]}</Tag>
  }
  const stepRow = (s: Step) => (
    <div key={s.id} className={`flex items-center gap-3 border-b ${HAIR} py-[13px]`}>
      {s.done ? (
        <span className="flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-lxsage">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#1F1E1C" strokeWidth="1.3" aria-hidden>
            <path d="M2 5.2l2 2 4-4.4" />
          </svg>
        </span>
      ) : (
        <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-[rgba(31,30,28,.28)]" />
      )}
      <span className={`flex-1 text-[14px] ${s.done ? "text-lxsoft" : ""}`}>
        {clientWording(s.title, agentFirst)}
        {!s.done && toOwner(s.owner) === "client" && s.due_on && (
          <span className="mt-0.5 block text-[12px] text-lxsoft">{clientDueLabel(s.due_on, tz)}</span>
        )}
      </span>
      {!s.done && tagFor(s)}
    </div>
  )
  const stageHead = (label: string, state: "now" | "later") => (
    <div className="mb-0.5 mt-[22px] flex items-baseline justify-between">
      <span className={`font-lux text-[19px] ${state === "now" ? "italic text-lxink" : "text-lxsoft"}`}>{label}</span>
      <span className="text-[11px] tracking-[.4px] text-lxsoft">{state === "now" ? "Now" : "Later"}</span>
    </div>
  )

  const journeyBlock = (j: Journey) => {
    const stages = stagesOf(j)
    const ci = stages.findIndex((s) => s.key === current(j))
    return (
      <div key={j}>
        {journeys.length > 1 && (
          <p className="m-0 mt-6 text-[11.5px] uppercase tracking-[.4px] text-lxsoft">{j === "sell" ? "Your sale" : "Your purchase"}</p>
        )}
        {stages.map((st, i) => {
          const rows = stepsIn(st.key)
          if (i < ci) {
            return (
              <details key={st.key} className={`group border-b ${HAIR}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <span className="h-[13px] w-[13px] shrink-0 rounded-full bg-lxsage" />
                    <span className="font-lux text-[19px] text-lxsoft">{st.label}</span>
                  </span>
                  <span className="text-[12px] text-lxsoft">
                    Complete
                    {rows.length > 0 && (
                      <span className="ml-2 text-lxink [border-bottom:1px_solid_#C2A46B]">
                        <span className="group-open:hidden">Show</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </span>
                    )}
                  </span>
                </summary>
                {rows.length > 0 && <div className="pb-2 pl-[25px]">{rows.map(stepRow)}</div>}
              </details>
            )
          }
          if (i === ci) {
            return (
              <div key={st.key}>
                {stageHead(st.label, "now")}
                {rows.map(stepRow)}
                {rows.length === 0 && (
                  <p className={`m-0 border-b ${HAIR} py-[13px] text-[14px] text-lxsoft`}>
                    {st.key === "open_house"
                      ? `${agentFirst} keeps the dates and notes under Your home.`
                      : st.key === "offers"
                        ? `Each offer and ${agentFirst}\u2019s notes are under Your home.`
                      : `${agentFirst} is preparing this for you.`}
                  </p>
                )}
              </div>
            )
          }
          return (
            <div key={st.key}>
              {stageHead(st.label, "later")}
              {st.steps.map((d) => (
                <div key={d.title} className={`flex items-center gap-3 border-b ${HAIR} py-[11px] text-[14px] text-lxsoft`}>
                  <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-dashed border-[rgba(31,30,28,.25)]" />
                  <span className="flex-1">{clientWording(d.title, agentFirst)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const next = (
    <section>
      <DotLabel color="blush">Your next step</DotLabel>
      <p className="m-0 mt-2.5 font-lux text-[28px] font-light leading-[1.15] md:text-[32px]">{nextTitle}</p>
      {nextSub && <p className="m-0 mt-2 text-[13px]">{nextSub}</p>}
      <div className="mt-[18px] flex flex-wrap gap-3">
        {action && (
          <a href={action.href} className={BTN}>
            {action.label}
          </a>
        )}
        {!messageIsAction && (
          <a href="#messages" className={OUTLINE}>
            Message {agentFirst}
          </a>
        )}
      </div>
    </section>
  )

  const progress = (
    <section>
      <H2 className="mb-1">Your progress</H2>
      <p className="m-0 mb-1.5 text-[12.5px] text-lxsoft">Each stage, and the steps inside it.</p>
      {journeys.map(journeyBlock)}
    </section>
  )

  // ---- Seller: their home, offers, open houses ----
  let yourHome: React.ReactNode = null
  if (selling) {
    const [street, ...rest] = (sell.sale_address || "").split(",")
    const listedFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" })
    const ohWhen = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" })
    const ohTime = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })
    const t = (iso: string) => ohTime.format(new Date(iso)).replace(":00", "")
    const showsLabel = privateShowings ? "Private showings" : "Open houses"
    // Shown once the sale reaches that stage, or as soon as there is something in them.
    const sellIdx = SELL_PHASES.findIndex((p) => p.key === sellCur)
    const showOpen = openHouses.length > 0 || sellIdx >= 2
    const showOffers = saleOffers.length > 0 || sellIdx >= 3
    yourHome = (
      <div className="flex flex-col gap-11">
        <section>
          <H2 className="mb-6">Your home</H2>
          {sell.sale_address ? (
            <div className="grid gap-7 md:grid-cols-[1.1fr_1fr] md:gap-14">
              <div>
                <p className="m-0 font-lux text-[30px] font-light leading-[1.1] md:text-[38px]">{street.trim()}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-[22px] gap-y-1">
                  {rest.length > 0 && <span className="text-[12.5px] text-lxsoft">{rest.join(",").trim()}</span>}
                  {sell.sale_url && (
                    <a href={sell.sale_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-lxink no-underline [border-bottom:1px_solid_#C2A46B]">
                      View your listing
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-7">
                {sell.sale_price ? (
                  <div>
                    <p className="m-0 text-[11.5px] tracking-[.4px] text-lxsoft">Listed at</p>
                    <p className="m-0 mt-1.5 font-lux text-[24px]">${Math.round(Number(sell.sale_price)).toLocaleString("en-US")}</p>
                  </div>
                ) : null}
                {sell.sale_listed_on ? (
                  <div>
                    <p className="m-0 text-[11.5px] tracking-[.4px] text-lxsoft">On the market</p>
                    <p className="m-0 mt-1.5 font-lux text-[24px]">Since {listedFmt.format(new Date(sell.sale_listed_on + "T12:00:00Z"))}</p>
                  </div>
                ) : null}
                {saleOffers.length > 0 && (
                  <div>
                    <p className="m-0 text-[11.5px] tracking-[.4px] text-lxsoft">Offers</p>
                    <p className="m-0 mt-1.5 font-lux text-[24px]">{WORDS[saleOffers.length] ?? saleOffers.length}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="m-0 text-[14px] text-lxsoft">{agentFirst} is preparing your listing details.</p>
          )}
        </section>

        {(showOffers || showOpen) && (
        <div className={`grid gap-11 border-t ${LINE} pt-[38px] md:grid-cols-2 md:gap-[72px]`}>
          {showOffers && (
          <section id="offers" className="scroll-mt-6">
            <H2 className="mb-1">Offers</H2>
            {saleOffers.length === 0 && (
              <p className="m-0 mt-2 text-[14px] text-lxsoft">No offers yet. {agentFirst} will add each one here as it arrives.</p>
            )}
            {saleOffers.map((o) => {
              const tg = OFFER_TAG[o.status] ?? OFFER_TAG.review
              return (
                <div key={o.id} className={`border-b ${HAIR} py-[18px]`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-lux text-[30px] font-light">${Math.round(Number(o.amount)).toLocaleString("en-US")}</span>
                    <Tag color={tg.color}>{tg.text}</Tag>
                  </div>
                  {(o.terms || o.received_on) && (
                    <p className="m-0 mt-1 text-[13px] text-lxsoft">
                      {[o.terms, o.received_on ? `Received ${listedFmt.format(new Date(o.received_on + "T12:00:00Z"))}` : ""].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {o.note && (
                    <>
                      <p className="m-0 mt-3 text-[11.5px] tracking-[.4px] text-lxsoft">{agentFirst}&rsquo;s note</p>
                      <p className="m-0 mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{o.note}</p>
                    </>
                  )}
                </div>
              )
            })}
          </section>
          )}
          {showOpen && (
          <section>
            <H2 className="mb-1">{showsLabel}</H2>
            <p className="m-0 mb-1 text-[12.5px] text-lxsoft">
              {privateShowings ? `For vetted buyers only. Times ${agentFirst} has set.` : `Dates and times ${agentFirst} has set. A short note follows each one.`}
            </p>
            {openHouses.length === 0 && <p className="m-0 mt-2 text-[14px] text-lxsoft">{agentFirst} will add dates here.</p>}
            {openHouses.map((o) => {
              const past = new Date(o.ends_at || o.starts_at).getTime() < Date.now()
              return (
                <div key={o.id} className={`border-b ${HAIR} py-4`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px]">
                      {ohWhen.format(new Date(o.starts_at))} &middot; {t(o.starts_at)}
                      {o.ends_at ? ` to ${t(o.ends_at)}` : ""}
                    </span>
                    {past ? (
                      <span className="text-[12px] text-lxsoft">{o.kind === "private" ? "Private showing" : "Open house"}</span>
                    ) : (
                      <Tag color="sage">Confirmed</Tag>
                    )}
                  </div>
                  {o.feedback && (
                    <>
                      <p className="m-0 mt-2.5 text-[11.5px] tracking-[.4px] text-lxsoft">What buyers said</p>
                      <p className="m-0 mt-1 font-lux text-[18px] italic leading-[1.4]">&ldquo;{o.feedback}&rdquo;</p>
                    </>
                  )}
                </div>
              )
            })}
          </section>
          )}
        </div>
        )}
      </div>
    )
  }

  const documents = (
    <section id="documents" className="scroll-mt-6">
      <H2 className="mb-1">Your documents</H2>
      {signed.length + toSign.length + collected.length === 0 && (
        <p className="m-0 mt-2 text-[14px] text-lxsoft">Nothing to sign or send yet. {agentFirst} will place documents here when it&rsquo;s time.</p>
      )}
      {toSign.map((d) => (
        <div key={d.id} className={`flex min-h-[48px] items-center justify-between gap-3 border-b ${HAIR} text-[14px]`}>
          <span>{d.title}</span>
          <Tag color="blue">Check your email to sign</Tag>
        </div>
      ))}
      {signed.map((d) => (
        <div key={d.id} className={`flex min-h-[48px] items-center justify-between gap-3 border-b ${HAIR} text-[14px]`}>
          <span>{d.title}</span>
          <Tag color="sage">Signed{d.signed_at ? ` ${fmtDay.format(new Date(d.signed_at))}` : ""}</Tag>
        </div>
      ))}
      {collected.map((d) => (
        <div key={d.id} className={`flex min-h-[48px] items-center justify-between gap-3 border-b ${HAIR} text-[14px]`}>
          <span>{d.title}</span>
          {d.received ? <Tag color="sage">{d.file_path ? "Sent" : "Received"}</Tag> : <UploadButton token={token} docId={d.id} />}
        </div>
      ))}
    </section>
  )

  const messagesPart = (
    <section id="messages" className="flex h-full scroll-mt-6 flex-col">
      <H2 className="mb-1">Messages with {agentFirst}</H2>
      <div className="flex min-h-[300px] flex-1 flex-col justify-end gap-3.5 py-[18px] md:min-h-[430px]">
        {messages.length === 0 && <p className="m-0 text-center text-[13px] text-lxsoft">Write to {agentFirst} whenever you like.</p>}
        {messages.map((m) => {
          const me = m.sender === "client"
          return (
            <div key={m.id} className={`flex flex-col gap-1 ${me ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-[14px] px-[15px] py-[11px] text-[14px] leading-[1.55] ${
                  me ? "bg-[#EFEDE9]" : `border ${HAIR} bg-white`
                }`}
              >
                {m.body}
              </div>
              <span className="text-[10.5px] text-lxsoft">{fmt.format(new Date(m.created_at))}</span>
            </div>
          )
        })}
      </div>
      {sp.error === "msg" && <p className="mb-2 text-xs text-red-800">That didn&rsquo;t send. Please try again.</p>}
      <form action={clientSendMessage} className={`flex items-end gap-3.5 border-t ${LINE} pt-3.5`}>
        <input type="hidden" name="token" value={token} />
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <textarea
            name="body"
            rows={1}
            required
            placeholder={`Write to ${agentFirst}…`}
            className="w-full resize-none border-0 bg-transparent px-0 py-2.5 font-luxsans text-[14px] text-lxink outline-none placeholder:text-[#8f8b84]"
          />
        </label>
        <button type="submit" className={QUIET}>
          Send
        </button>
      </form>
    </section>
  )

  return (
    <main className="min-h-screen bg-lxbg font-luxsans text-lxink antialiased">
      <div className="mx-auto max-w-[1280px] px-6 pt-[30px] md:px-[120px] md:pt-[52px]">
        <AgentHeader name={agentName} brokerage={agent?.business_name} />

        <div className="pb-6 pt-[26px] md:pb-[34px] md:pt-11">
          <h1 className="m-0 font-lux text-[28px] font-light leading-[1.12] md:text-[46px] md:leading-[1.1] md:tracking-[-.2px]">
            Hello{firstName ? ` ${firstName}` : ""}. Here&rsquo;s where {what}.
          </h1>
          <p className="m-0 mt-3 text-[14px] text-lxsoft">
            Your {suite}, prepared by {agentFirst}.
          </p>
        </div>

        <div className="flex flex-col gap-[30px] pb-[30px] md:gap-[34px] md:pb-[46px]">
          {journeys.map((j) => (
            <div key={j}>
              {journeys.length > 1 && (
                <p className="m-0 mb-3.5 text-[11.5px] tracking-[.4px] text-lxsoft">
                  {j === "sell" ? `Your sale${sell.sale_address ? ` · ${(sell.sale_address || "").split(",")[0]}` : ""}` : "Your purchase"}
                </p>
              )}
              <Tracker labels={stagesOf(j).map((s) => s.label)} current={stagesOf(j).findIndex((s) => s.key === current(j))} />
            </div>
          ))}
        </div>

        <PortalTabs
          next={next}
          progress={progress}
          yourHome={yourHome}
          homes={buying && homes.length ? <PortalHomes token={token} homes={homes} agentFirst={agentFirst} /> : undefined}
          documents={documents}
          messages={messagesPart}
        />
        <div className="hidden md:block">
          <SuiteFooter />
        </div>
      </div>
    </main>
  )
}
