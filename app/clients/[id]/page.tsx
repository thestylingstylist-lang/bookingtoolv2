import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import JacketDetails from "./jacket-details"
import SendDocument from "./send-document"
import { sendMessage, resendDocument } from "./actions"
import LeftColumn, { type Task, type Collected } from "./left-column"
import DealPanel, { type Offer, type Note } from "./deal-panel"

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
    .select("id, first_name, last_name, email, phone, address, created_at, client_type, budget_min, budget_max")
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
      .select("id, title, done")
      .eq("client_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("collected_docs")
      .select("id, title, received")
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
  const tasks = (taskData ?? []) as Task[]
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
      <main className="bg-white lg:h-screen lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[280px_minmax(0,1fr)_300px]">
          {/* Tasks + documents collected */}
          <div className="border-b border-[#ecebe6] bg-[#f4f3f0] px-5 py-6 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <Link
              href="/clients"
              className="mb-6 inline-block text-xs text-[#8c8a83] underline-offset-2 hover:text-ink hover:underline"
            >
              &larr; All clients
            </Link>
            <LeftColumn clientId={client.id} tasks={tasks} collected={collected} />
          </div>

          {/* Conversation */}
          <section className="flex min-h-[600px] flex-col bg-white lg:min-h-0">
            <div className="flex items-center gap-3 border-b border-[#ecebe6] px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2e4dd] font-serif text-base text-[#8a6a5f]">
                {initials(client.first_name, client.last_name)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold">{name}</h1>
                <p className="text-xs text-[#8c8a83]">{client.phone || client.email || "\u00a0"}</p>
              </div>
            </div>

            {(sp.updated || banner || error) && (
              <div className="space-y-2 px-6 pt-4">
                {sp.updated && (
                  <p className="rounded-lg bg-[#e4ece7] px-4 py-2.5 text-sm text-sage">Client updated.</p>
                )}
                {banner && (
                  <p
                    className={`rounded-lg px-4 py-2.5 text-sm ${
                      banner.ok ? "bg-[#e4ece7] text-sage" : "bg-[#f0e7d6] text-brass"
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
                  <p className="m-auto max-w-xs py-16 text-center text-sm text-[#8c8a83]">
                    Nothing here yet. Send the agreement to get started.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "agent"
                  const doc = m.document_id ? docs.get(m.document_id) : undefined
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {doc ? (
                        <div className="w-full max-w-sm rounded-2xl rounded-br-[5px] border border-[#ecebe6] bg-white px-4 py-4 shadow-[0_3px_10px_rgba(0,0,0,0.04)]">
                          <p className="text-[10px] uppercase tracking-[0.09em] text-[#8c8a83]">
                            Document to sign
                          </p>
                          <p className="mt-1 font-serif text-xl">{doc.title}</p>
                          <div className="mt-3 flex items-center gap-3">
                            {doc.status === "signed" ? (
                              <span className="rounded-full bg-[#e4ece7] px-2.5 py-0.5 text-[11px] text-sage">
                                Signed{doc.signed_at ? ` \u00b7 ${fmtDay.format(new Date(doc.signed_at))}` : ""}
                                {doc.signer_name ? ` by ${doc.signer_name}` : ""}
                              </span>
                            ) : (
                              <>
                                <span className="rounded-full bg-[#f0e7d6] px-2.5 py-0.5 text-[11px] text-brass">
                                  Sent &middot; waiting
                                </span>
                                <form action={resendDocument}>
                                  <input type="hidden" name="documentId" value={doc.id} />
                                  <input type="hidden" name="clientId" value={client.id} />
                                  <button className="text-xs text-[#8c8a83] underline hover:text-ink">
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
                            mine ? "rounded-br-[5px] bg-[#e7d3c7]" : "rounded-bl-[5px] bg-[#f4f3f0]"
                          }`}
                        >
                          {m.body}
                        </div>
                      )}
                      <span className="mx-1 mb-3 mt-1 text-[11px] text-[#b3b1aa]">
                        {fmt.format(new Date(m.created_at))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-[#ecebe6] px-6 py-4">
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
                  className="flex-1 resize-none rounded-xl border border-[#ecebe6] bg-[#f4f3f0] px-4 py-2.5 text-sm outline-none placeholder:text-[#8c8a83] focus:border-sage focus:bg-white"
                />
                <button
                  type="submit"
                  className="rounded-[11px] bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                >
                  Send
                </button>
              </form>
              <p className="mt-2 text-[11px] text-[#b3b1aa]">
                Messages are for your record for now. {client.first_name || "Your client"} will see them once
                client portals launch. Documents go out by email today.
              </p>
            </div>
          </section>

          {/* Client panel */}
          <aside className="border-t border-[#ecebe6] bg-white px-5 py-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
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
          </aside>
        </div>
      </main>
    </AppShell>
  )
}
