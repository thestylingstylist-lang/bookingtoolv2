import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import JacketDetails from "./jacket-details"
import JacketTabs from "./jacket-tabs"
import DocumentsPanel from "./documents-panel"
import SendDocument from "./send-document"
import { sendMessage, resendDocument } from "./actions"
import { sendPortalLink } from "./portal-actions"
import LeftColumn, { type Task, type Collected } from "./left-column"
import DealPanel, { type Offer, type Note } from "./deal-panel"
import { PHASES, phaseIndex, toPhase } from "@/lib/phases"

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
  portalsent: { text: "Portal link sent. Your client can open their page from the email.", ok: true },
  portalnoemail: { text: "This client has no email. Add one in Details, then send the portal link.", ok: false },
  portalfail: { text: "The portal link email didn't go out. Please try again.", ok: false },
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
  searchParams: Promise<{ updated?: string; doc?: string; error?: string }>
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
      .select("id, title, done, phase")
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
  const docs = new Map(((docData ?? []) as Doc[]).map((d) => [d.id, d]))
  const templates = (tplData ?? []) as { id: string; title: string; body: string }[]
  const phase = toPhase(client.phase)
  const tasks = ((taskData ?? []) as (Task & { phase: string | null })[]).filter(
    (t) => toPhase(t.phase) === phase
  )
  const pi = phaseIndex(phase)
  const collected = (colData ?? []) as Collected[]
  const offers = (offerData ?? []) as Offer[]
  const notes = (noteData ?? []) as Note[]

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

  return (
    <AppShell agent={agent}>
      <main className="flex flex-col bg-white lg:h-screen lg:overflow-hidden">
        {/* Client header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-[#e4e3e0] px-5 py-4 sm:flex-nowrap sm:px-6">
          <Link
            href="/clients"
            className="order-first basis-full text-xs text-[#5d5b62] underline-offset-2 hover:text-ink hover:underline sm:order-last sm:basis-auto"
          >
            &larr; All clients
          </Link>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f0ee] font-serif font-semibold tracking-tight text-base text-[#16151a]">
            {initials(client.first_name, client.last_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-[15px]">{name}</h1>
            <p className="truncate text-xs text-[#5d5b62]">{client.phone || client.email || "\u00a0"}</p>
          </div>
          {/* Actions: their own full-width row on phones, inline on desktop */}
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <form action={sendPortalLink} className="flex-1 sm:order-last sm:flex-none">
              <input type="hidden" name="clientId" value={client.id} />
              <button
                type="submit"
                className="w-full rounded-[10px] bg-ox px-3.5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 sm:w-auto sm:py-2 sm:text-xs"
              >
                Send portal link
              </button>
            </form>
            {client.portal_token && (
              <a
                href={`/portal/${client.portal_token}`}
                target="_blank"
                rel="noopener"
                className="shrink-0 rounded-[10px] border border-[#e4e3e0] px-3.5 py-2.5 text-sm text-[#5d5b62] hover:text-ink sm:border-0 sm:px-0 sm:py-0 sm:text-xs sm:underline-offset-2 sm:hover:underline"
              >
                Preview portal
              </a>
            )}
          </div>
        </div>

        {/* Phase tracker */}
        <div className="flex items-center border-b border-[#e4e3e0] bg-[#f5f5f5] px-6 py-4">
          {PHASES.map((p, idx) => {
            const state = idx < pi ? "done" : idx === pi ? "now" : "later"
            return (
              <div key={p.key} className={`flex items-center ${idx < PHASES.length - 1 ? "flex-1" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold ${
                      state === "done"
                        ? "border-sage bg-sage text-white"
                        : state === "now"
                          ? "border-ink bg-ox text-white"
                          : "border-[#d6d4d0] bg-white text-[#5d5b62]"
                    }`}
                  >
                    {state === "done" ? "\u2713" : idx + 1}
                  </span>
                  <span
                    className={`text-[13px] ${
                      state === "now" ? "font-semibold" : state === "done" ? "" : "text-[#5d5b62]"
                    }`}
                  >
                    {p.label}
                  </span>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={`mx-4 h-[1.5px] flex-1 ${idx < pi ? "bg-sage" : "bg-[#d3d2d5]"}`} />
                )}
              </div>
            )
          })}
        </div>

        <JacketTabs
          documents={<DocumentsPanel clientId={client.id} collected={collected} />}
          tasks={<>
            <LeftColumn
              clientId={client.id}
              firstName={client.first_name}
              phase={phase}
              tasks={tasks}
            />
          </>}
          messages={<>
            {(sp.updated || banner || error) && (
              <div className="space-y-2 px-6 pt-4">
                {sp.updated && (
                  <p className="rounded-lg bg-[#e5f1f0] px-4 py-2.5 text-sm text-sage">Client updated.</p>
                )}
                {banner && (
                  <p
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                      banner.ok ? "bg-[#e5f1f0] text-sage" : "bg-[#f1f0ee] text-brass"
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
                  <p className="m-auto max-w-xs py-16 text-center text-sm text-[#5d5b62]">
                    Nothing here yet. Send the agreement to get started.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "agent"
                  const doc = m.document_id ? docs.get(m.document_id) : undefined
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {doc ? (
                        <div className="w-full max-w-sm rounded-2xl rounded-br-[5px] border border-[#e4e3e0] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.04)]">
                          <p className="text-[10px] uppercase tracking-[0.09em] text-[#5d5b62]">
                            Document to sign
                          </p>
                          <p className="mt-1 font-serif font-semibold tracking-tight text-xl">{doc.title}</p>
                          <div className="mt-3 flex items-center gap-3">
                            {doc.status === "signed" ? (
                              <span className="rounded-full bg-[#e5f1f0] px-2.5 py-0.5 text-[11px] text-sage">
                                Signed{doc.signed_at ? ` \u00b7 ${fmtDay.format(new Date(doc.signed_at))}` : ""}
                                {doc.signer_name ? ` by ${doc.signer_name}` : ""}
                              </span>
                            ) : (
                              <>
                                <span className="rounded-full bg-[#f1f0ee] px-2.5 py-0.5 text-[11px] text-brass">
                                  Sent &middot; waiting
                                </span>
                                <form action={resendDocument}>
                                  <input type="hidden" name="documentId" value={doc.id} />
                                  <input type="hidden" name="clientId" value={client.id} />
                                  <button className="text-xs text-[#5d5b62] underline hover:text-ink">
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
                            mine ? "rounded-br-[5px] bg-[#eeedeb]" : "rounded-bl-[5px] bg-[#f1f0ee]"
                          }`}
                        >
                          {m.body}
                        </div>
                      )}
                      <span className="mx-1 mb-3 mt-1 text-[11px] text-[#9a989e]">
                        {fmt.format(new Date(m.created_at))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-[#e4e3e0] px-6 py-4">
              <div className="mb-3">
                <SendDocument clientId={client.id} templates={templates} />
              </div>
              <form action={sendMessage} className="flex items-end gap-3">
                <input type="hidden" name="clientId" value={client.id} />
                <textarea
                  name="body"
                  rows={1}
                  required
                  placeholder="Type a message…"
                  className="flex-1 resize-none rounded-xl border border-[#e4e3e0] bg-[#f1f0ee] px-4 py-2.5 text-sm outline-none placeholder:text-[#5d5b62] focus:border-sage focus:bg-white"
                />
                <button
                  type="submit"
                  className="rounded-[11px] bg-ox px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                >
                  Send
                </button>
              </form>
              <p className="mt-2 text-[11px] text-[#9a989e]">
                {client.first_name || "Your client"} sees these messages on their portal and can reply there.
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
