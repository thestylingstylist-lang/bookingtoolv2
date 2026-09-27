import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { PHASES, phaseIndex, toPhase, toOwner, OWNER_LABEL_CLIENT } from "@/lib/phases"
import { clientSendMessage } from "./actions"
import UploadButton from "./upload-button"
import PortalTabs from "./portal-tabs"

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
        .select("id, title, received, file_path")
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
    <main className="min-h-screen bg-[#f1f0ee] text-[#16151a]">
      <div className="mx-auto max-w-[980px] px-5 pb-8 pt-5">
        {/* Agent */}
        <div className="flex items-center justify-between border-b border-[#e4e3e0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#f8e6ec] font-serif text-base text-[#8e2a4c]">
              {agentInitials}
            </div>
            <div>
              <p className="text-sm font-semibold">{agentName}</p>
              <p className="text-[11.5px] text-[#5d5b62]">
                Your agent{agent?.business_name && agent.full_name ? ` · ${agent.business_name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="pb-3 pt-[18px]">
          <h1 className="font-serif text-[26px] leading-tight sm:text-[30px]">
            Hi{firstName ? ` ${firstName}` : ""}, here&rsquo;s where your home search stands.
          </h1>
          <p className="mt-1 text-[13.5px] text-[#5d5b62]">Everything about your search, in one place.</p>
        </div>

        {/* Tracker */}
        <div className="flex items-center rounded-xl border border-[#e4e3e0] bg-white px-4 py-[11px]">
          {PHASES.map((p, idx) => (
            <div key={p.key} className={`flex items-center ${idx < PHASES.length - 1 ? "flex-1" : ""}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold ${
                    idx < pi
                      ? "border-[#2f7f7e] bg-[#2f7f7e] text-white"
                      : idx === pi
                        ? "border-[#16151a] bg-[#16151a] text-white"
                        : "border-[#d6d4d0] bg-white text-[#5d5b62]"
                  }`}
                >
                  {idx < pi ? "✓" : idx + 1}
                </span>
                <span className={`text-xs sm:text-[13px] ${idx === pi ? "font-semibold" : "text-[#5d5b62]"}`}>{p.label}</span>
              </div>
              {idx < PHASES.length - 1 && <div className="mx-2 h-[1.5px] flex-1 bg-[#e2e0dc] sm:mx-3.5" />}
            </div>
          ))}
        </div>

        <PortalTabs
          next={
            <>
              {/* Next step */}
            <div className="rounded-xl border border-[#cfe6e4] bg-[#e5f1f0] px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2f7f7e]">
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
                <a href="#messages" className="inline-block rounded-[9px] bg-[#16151a] px-[15px] py-2 text-[13px] font-medium text-white">
                  Message {agentFirst}
                </a>
              )}
            </div>

            {/* Progress */}
            <div className="rounded-xl border border-[#e4e3e0] bg-white px-4 py-3.5">
              <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#5d5b62]">Your progress</h2>
              {steps.length === 0 && <p className="py-1.5 text-[13.5px] text-[#5d5b62]">{agentFirst} is setting this up.</p>}
              {steps.map((s) => {
                const owner = toOwner(s.owner)
                return (
                  <div key={s.id} className="flex items-center gap-2.5 border-b border-[#e4e3e0] py-1.5 text-[13.5px] last:border-0">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[9px] text-white ${
                        s.done ? "border-[#2f7f7e] bg-[#2f7f7e]" : "border-[#d6d4d0]"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <span className={s.done ? "text-[#5d5b62]" : ""}>{clientWording(s.title, agentFirst)}</span>
                    {!s.done && (
                      <span
                        className={`ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] ${
                          owner === "client" ? "bg-[#e5f1f0] text-[#2f7f7e]" : "bg-[#f1f0ee] text-[#5d5b62]"
                        }`}
                      >
                        {owner === "agent" ? agentFirst : OWNER_LABEL_CLIENT[owner]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            </>
          }
          documents={
            <>
              {/* Documents */}
            {(signed.length > 0 || toSign.length > 0 || collected.length > 0) && (
              <div className="rounded-xl border border-[#e4e3e0] bg-white px-4 py-3.5">
                <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#5d5b62]">Your documents</h2>
                {toSign.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#e4e3e0] py-2 text-[13.5px]">
                    <span>{d.title}</span>
                    <span className="rounded-full bg-[#e5f1f0] px-2 py-0.5 text-[10.5px] text-[#2f7f7e]">Check your email to sign</span>
                  </div>
                ))}
                {signed.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#e4e3e0] py-2 text-[13.5px]">
                    <span>{d.title}</span>
                    <span className="rounded-full bg-[#e5f1f0] px-2 py-0.5 text-[10.5px] text-[#2f7f7e]">
                      Signed{d.signed_at ? ` ${fmtDay.format(new Date(d.signed_at))}` : ""}
                    </span>
                  </div>
                ))}
                {collected.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#e4e3e0] py-2 text-[13.5px] last:border-0">
                    <span>{d.title}</span>
                    {d.received ? (
                      <span className="rounded-full bg-[#e5f1f0] px-2 py-0.5 text-[10.5px] text-[#2f7f7e]">
                        {d.file_path ? "Sent" : "Received"}
                      </span>
                    ) : (
                      <UploadButton token={token} docId={d.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
              {!(signed.length > 0 || toSign.length > 0 || collected.length > 0) && (
              <div className="rounded-xl border border-[#e4e3e0] bg-white px-4 py-3.5">
                <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#5d5b62]">Your documents</h2>
                <p className="py-1.5 text-[13.5px] text-[#5d5b62]">Nothing to sign or upload yet. {agentFirst} will add documents here when it&rsquo;s time.</p>
              </div>
            )}
            </>
          }
          messages={
            <>
              {/* Messages */}
          <div id="messages" className="flex flex-1 flex-col rounded-xl border border-[#e4e3e0] bg-white px-4 py-3.5">
            <h2 className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#5d5b62]">
              Messages with {agentFirst}
            </h2>
            <div className="flex min-h-[220px] flex-1 flex-col justify-end gap-1.5">
              {messages.length === 0 && (
                <p className="text-center text-[13px] text-[#5d5b62]">Say hi to {agentFirst} below.</p>
              )}
              {messages.map((m) => {
                const me = m.sender === "client"
                return (
                  <div key={m.id} className={`flex flex-col ${me ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap rounded-[14px] px-[13px] py-[9px] text-[13.5px] leading-relaxed ${
                        me ? "rounded-br-[4px] bg-[#f5dbe3]" : "rounded-bl-[4px] bg-[#f1f0ee]"
                      }`}
                    >
                      {m.body}
                    </div>
                    <span className="mb-1 mt-0.5 text-[10.5px] text-[#9a989e]">{fmt.format(new Date(m.created_at))}</span>
                  </div>
                )
              })}
            </div>
            {sp.error === "msg" && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">That didn&rsquo;t send. Please try again.</p>
            )}
            <form action={clientSendMessage} className="mt-2.5 flex gap-2 border-t border-[#e4e3e0] pt-2.5">
              <input type="hidden" name="token" value={token} />
              <textarea
                name="body"
                rows={1}
                required
                placeholder={`Message ${agentFirst}…`}
                className="flex-1 resize-none rounded-[9px] border border-[#e4e3e0] bg-[#f1f0ee] px-3 py-2 text-[13.5px] outline-none placeholder:text-[#5d5b62] focus:bg-white"
              />
              <button type="submit" className="rounded-[9px] bg-[#16151a] px-[15px] py-2 text-[13px] font-medium text-white hover:opacity-90">
                Send
              </button>
            </form>
          </div>
            </>
          }
        />
      </div>
    </main>
  )
}
