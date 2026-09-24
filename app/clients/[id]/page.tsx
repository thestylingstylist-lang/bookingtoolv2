import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import JacketDetails from "./jacket-details"
import SendDocument from "./send-document"
import { sendMessage, resendDocument } from "./actions"
import LeftColumn, { type Task, type Collected } from "./left-column"

export const dynamic = "force-dynamic"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
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
    .select("id, first_name, last_name, email, phone, address, created_at")
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
  ])
  const messages = (msgData ?? []) as Message[]
  const docs = new Map(((docData ?? []) as Doc[]).map((d) => [d.id, d]))
  const templates = (tplData ?? []) as { id: string; title: string; body: string }[]
  const tasks = (taskData ?? []) as Task[]
  const collected = (colData ?? []) as Collected[]

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
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/clients"
          className="text-sm text-ink/50 underline-offset-2 hover:text-ink/80 hover:underline"
        >
          &larr; All clients
        </Link>
        <h1 className="mt-3 font-serif text-3xl">{name}</h1>

        {sp.updated && (
          <p className="mt-5 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">Client updated.</p>
        )}
        {banner && (
          <p
            className={`mt-5 rounded-lg px-4 py-3 text-sm ${
              banner.ok ? "bg-sage/10 text-sage" : "bg-brass/10 text-brass"
            }`}
          >
            {banner.text}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* Tasks + documents collected */}
          <LeftColumn clientId={client.id} tasks={tasks} collected={collected} />

          {/* Conversation */}
          <section className="flex min-h-[520px] flex-col rounded-2xl border border-ink/10 bg-white/50">
            <div className="flex flex-1 flex-col gap-2 p-6">
              {messages.length === 0 && (
                <p className="m-auto max-w-xs text-center text-sm text-ink/50">
                  Nothing here yet. Send the agreement to get started.
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender === "agent"
                const doc = m.document_id ? docs.get(m.document_id) : undefined
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {doc ? (
                      <div className="w-full max-w-sm rounded-2xl rounded-br-md border border-ink/10 bg-white p-4 shadow-sm">
                        <p className="text-[11px] uppercase tracking-wide text-ink/50">
                          Document to sign
                        </p>
                        <p className="mt-1 font-serif text-lg">{doc.title}</p>
                        <div className="mt-3 flex items-center gap-3">
                          {doc.status === "signed" ? (
                            <span className="rounded-full bg-sage/15 px-3 py-1 text-xs text-sage">
                              Signed{doc.signed_at ? ` ${fmtDay.format(new Date(doc.signed_at))}` : ""}
                              {doc.signer_name ? ` by ${doc.signer_name}` : ""}
                            </span>
                          ) : (
                            <>
                              <span className="rounded-full bg-brass/15 px-3 py-1 text-xs text-brass">
                                Sent &middot; waiting
                              </span>
                              <form action={resendDocument}>
                                <input type="hidden" name="documentId" value={doc.id} />
                                <input type="hidden" name="clientId" value={client.id} />
                                <button className="text-xs text-ink/50 underline hover:text-ink">
                                  Resend
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          mine
                            ? "rounded-br-md bg-[#e7d3c7]"
                            : "rounded-bl-md border border-ink/10 bg-white"
                        }`}
                      >
                        {m.body}
                      </div>
                    )}
                    <span className="mx-1 mb-2 mt-1 text-[11px] text-ink/40">
                      {fmt.format(new Date(m.created_at))}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-ink/10 p-4">
              <div className="mb-3">
                <SendDocument clientId={client.id} templates={templates} />
              </div>
              <form action={sendMessage} className="flex items-end gap-3">
                <input type="hidden" name="clientId" value={client.id} />
                <textarea
                  name="body"
                  rows={2}
                  required
                  placeholder="Type a message…"
                  className="flex-1 resize-none rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
                >
                  Send
                </button>
              </form>
              <p className="mt-2 text-xs text-ink/40">
                Messages are for your record for now. {client.first_name || "Your client"} will see
                them once client portals launch. Documents go out by email today.
              </p>
            </div>
          </section>

          {/* Client panel */}
          <aside className="[&>section]:mt-0 [&_form]:!grid-cols-1">
            <JacketDetails client={client} />
          </aside>
        </div>
      </main>
    </AppShell>
  )
}
