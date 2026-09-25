import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { PHASES, phaseIndex, toPhase, toOwner, OWNER_LABEL_CLIENT } from "@/lib/phases"
import { clientSendMessage } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Your home search", robots: { index: false, follow: false } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Standard steps, reworded from the client's point of view. Steps the realtor
// adds themselves show as written.
function clientWording(title: string, agentFirst: string) {
  const map: Record<string, string> = {
    "Ask what they're looking for": `${agentFirst} asks what you're looking for`,
    "Buyer sent their criteria": "Send your wish list",
    "Send curated homes": `${agentFirst} sends homes to look at`,
    "Get their availability": "Share when you're free to see homes",
    "Set up viewings": "Viewings booked",
    "Collect the client's documents": "Send your documents",
    "Put together the offer packet": `${agentFirst} puts your offer together`,
    "Send the offer to the selling agent": "Offer sent to the seller's agent",
    "Hear back from the selling agent": "Waiting to hear if your offer is accepted",
    "Client connects with a lawyer": "Connect with your lawyer",
    "Client applies for the loan": "Loan with your lender",
  }
  return map[title] ?? title
}

type Step = { id: string; title: string; done: boolean; phase: string | null; owner: string | null }

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
    .select("id, agent_id, first_name, phase")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) notFound()

  const [{ data: agent }, { data: stepData }, { data: docData }, { data: colData }, { data: msgData }] =
    await Promise.all([
      admin.from("agents").select("full_name, business_name, timezone").eq("id", client.agent_id).maybeSingle(),
      admin
        .from("steps")
        .select("id, title, done, phase, owner")
        .eq("client_id", client.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      admin
        .from("documents")
        .select("id, title, status, signed_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true }),
      admin
        .from("collected_docs")
        .select("id, title, received")
        .eq("client_id", client.id)
        .order("created_at", { ascending: true }),
      admin
        .from("messages")
        .select("id, created_at, sender, body")
        .eq("client_id", client.id)
        .not("body", "is", null)
        .order("created_at", { ascending: true }),
    ])

  const agentName = agent?.full_name || agent?.business_name || "Your agent"
  const agentFirst = (agent?.full_name || "").trim().split(/\s+/)[0] || "Your agent"
  const agentInitials =
    (agent?.full_name || agent?.business_name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w.charAt(0))
      .join("")
      .toUpperCase() || "?"
  const tz = agent?.timezone || "America/New_York"
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" })

  const phase = toPhase(client.phase)
  const pi = phaseIndex(phase)
  const steps = ((stepData ?? []) as Step[]).filter((s) => toPhase(s.phase) === phase)
  const signed = (docData ?? []).filter((d) => d.status === "signed")
  const toSign = (docData ?? []).filter((d) => d.status !== "signed")
  const collected = colData ?? []
  const messages = msgData ?? []

  const mine = steps.find((s) => !s.done && toOwner(s.owner) === "client")
  const waiting = steps.find((s) => !s.done)
  const firstName = client.first_name?.trim() || ""

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-[#3d3230]">
      <div className="mx-auto max-w-[980px] px-5 pb-8 pt-5">
        {/* Agent */}
        <div className="flex items-center justify-between border-b border-[#ecebe6] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#f2e4dd] font-serif text-base text-[#8a6a5f]">
              {agentInitials}
            </div>
            <div>
              <p className="text-sm font-semibold">{agentName}</p>
              <p className="text-[11.5px] text-[#8a7872]">
                Your agent{agent?.business_name && agent.full_name ? ` · ${agent.business_name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="pb-3 pt-[18px]">
          <h1 className="font-serif text-[26px] leading-tight sm:text-[30px]">
            Hi{firstName ? ` ${firstName}` : ""}, here&rsquo;s where your home search stands.
          </h1>
          <p className="mt-1 text-[13.5px] text-[#8a7872]">Everything about your search, in one place.</p>
        </div>

        {/* Tracker */}
        <div className="flex items-center rounded-xl border border-[#ecebe6] bg-white px-4 py-[11px]">
          {PHASES.map((p, idx) => (
            <div key={p.key} className={`flex items-center ${idx < PHASES.length - 1 ? "flex-1" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold ${
                    idx < pi
                      ? "border-[#5f7266] bg-[#5f7266] text-white"
                      : idx === pi
                        ? "border-[#3d3230] bg-[#3d3230] text-white"
                        : "border-[#d9d7d0] bg-white text-[#8a7872]"
                  }`}
                >
                  {idx < pi ? "✓" : idx + 1}
                </span>
                <span className={`text-xs sm:text-[13px] ${idx === pi ? "font-semibold" : "text-[#8a7872]"}`}>{p.label}</span>
              </div>
              {idx < PHASES.length - 1 && <div className="mx-2 h-[1.5px] flex-1 bg-[#e4e2dc] sm:mx-3.5" />}
            </div>
          ))}
        </div>

        <div className="mt-3 grid items-stretch gap-3 md:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-3">
            {/* Next step */}
            <div className="rounded-xl border border-[#d9ebdd] bg-[#eaf4ec] px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3f7a52]">
                {mine ? "Your next step" : "Right now"}
              </p>
              <p className="mb-2.5 mt-0.5 font-serif text-[21px] leading-snug">
                {mine
                  ? clientWording(mine.title, agentFirst)
                  : waiting
                    ? `${clientWording(waiting.title, agentFirst)}. Nothing needed from you.`
                    : `You're all caught up. ${agentFirst} will let you know what's next.`}
              </p>
              {mine && (
                <a href="#messages" className="inline-block rounded-[9px] bg-[#3d3230] px-[15px] py-2 text-[13px] font-medium text-white">
                  Message {agentFirst}
                </a>
              )}
            </div>

            {/* Progress */}
            <div className="rounded-xl border border-[#ecebe6] bg-white px-4 py-3.5">
              <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#8a7872]">Your progress</h2>
              {steps.length === 0 && <p className="py-1.5 text-[13.5px] text-[#8a7872]">{agentFirst} is setting this up.</p>}
              {steps.map((s) => {
                const owner = toOwner(s.owner)
                return (
                  <div key={s.id} className="flex items-center gap-2.5 border-b border-[#ecebe6] py-1.5 text-[13.5px] last:border-0">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[9px] text-white ${
                        s.done ? "border-[#5f7266] bg-[#5f7266]" : "border-[#d6d3cc]"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <span className={s.done ? "text-[#8a7872]" : ""}>{clientWording(s.title, agentFirst)}</span>
                    {!s.done && (
                      <span
                        className={`ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] ${
                          owner === "client" ? "bg-[#eaf4ec] text-[#3f7a52]" : "bg-[#f6f4ee] text-[#8a7872]"
                        }`}
                      >
                        {owner === "agent" ? agentFirst : OWNER_LABEL_CLIENT[owner]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Documents */}
            {(signed.length > 0 || toSign.length > 0 || collected.length > 0) && (
              <div className="rounded-xl border border-[#ecebe6] bg-white px-4 py-3.5">
                <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#8a7872]">Your documents</h2>
                {toSign.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#ecebe6] py-2 text-[13.5px]">
                    <span>{d.title}</span>
                    <span className="rounded-full bg-[#eaf4ec] px-2 py-0.5 text-[10.5px] text-[#3f7a52]">Check your email to sign</span>
                  </div>
                ))}
                {signed.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#ecebe6] py-2 text-[13.5px]">
                    <span>{d.title}</span>
                    <span className="rounded-full bg-[#e4ece7] px-2 py-0.5 text-[10.5px] text-[#5f7266]">
                      Signed{d.signed_at ? ` ${fmtDay.format(new Date(d.signed_at))}` : ""}
                    </span>
                  </div>
                ))}
                {collected.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#ecebe6] py-2 text-[13.5px] last:border-0">
                    <span>{d.title}</span>
                    {d.received ? (
                      <span className="rounded-full bg-[#e4ece7] px-2 py-0.5 text-[10.5px] text-[#5f7266]">Received</span>
                    ) : (
                      <span className="rounded-full bg-[#f6f4ee] px-2 py-0.5 text-[10.5px] text-[#8a7872]">Needed</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div id="messages" className="flex flex-col rounded-xl border border-[#ecebe6] bg-white px-4 py-3.5">
            <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#8a7872]">
              Messages with {agentFirst}
            </h2>
            <div className="flex min-h-[220px] flex-1 flex-col justify-end gap-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-[#8a7872]">Say hi to {agentFirst} below.</p>
              )}
              {messages.map((m) => {
                const me = m.sender === "client"
                return (
                  <div key={m.id} className={`flex flex-col ${me ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap rounded-[14px] px-[13px] py-[9px] text-[13.5px] leading-relaxed ${
                        me ? "rounded-br-[4px] bg-[#e7d3c7]" : "rounded-bl-[4px] bg-[#f6f4ee]"
                      }`}
                    >
                      {m.body}
                    </div>
                    <span className="mb-1 mt-0.5 text-[10.5px] text-[#b5a59f]">{fmt.format(new Date(m.created_at))}</span>
                  </div>
                )
              })}
            </div>
            {sp.error === "msg" && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">That didn&rsquo;t send. Please try again.</p>
            )}
            <form action={clientSendMessage} className="mt-2.5 flex gap-2 border-t border-[#ecebe6] pt-2.5">
              <input type="hidden" name="token" value={token} />
              <textarea
                name="body"
                rows={1}
                required
                placeholder={`Message ${agentFirst}…`}
                className="flex-1 resize-none rounded-[9px] border border-[#ecebe6] bg-[#f6f4ee] px-3 py-2 text-[13.5px] outline-none placeholder:text-[#8a7872] focus:bg-white"
              />
              <button type="submit" className="rounded-[9px] bg-[#3d3230] px-[15px] py-2 text-[13px] font-medium text-white hover:opacity-90">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
