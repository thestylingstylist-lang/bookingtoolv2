import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import ReplyForm from "./reply-form"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  agent_id: string
  agent_email: string | null
  agent_name: string | null
  body: string
  from_team: boolean
  read_by_team: boolean
  created_at: string
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const { data } = await admin
    .from("support_messages")
    .select("id, agent_id, agent_email, agent_name, body, from_team, read_by_team, created_at")
    .order("created_at", { ascending: true })
    .limit(5000)
  const rows = (data ?? []) as Row[]

  // Group into one thread per agent.
  const threads = new Map<string, { agentId: string; name: string; email: string; msgs: Row[]; unread: number; last: string }>()
  for (const r of rows) {
    let t = threads.get(r.agent_id)
    if (!t) {
      t = { agentId: r.agent_id, name: "", email: "", msgs: [], unread: 0, last: r.created_at }
      threads.set(r.agent_id, t)
    }
    if (!r.from_team) {
      t.name = r.agent_name || t.name
      t.email = r.agent_email || t.email
      if (!r.read_by_team) t.unread++
    }
    t.msgs.push(r)
    t.last = r.created_at
  }
  const list = [...threads.values()].sort((x, y) => (x.last < y.last ? 1 : -1))

  const selectedId = (await searchParams).a || list[0]?.agentId
  const selected = list.find((t) => t.agentId === selectedId)

  // Opening a thread marks it read.
  if (selected && selected.unread > 0) {
    await admin
      .from("support_messages")
      .update({ read_by_team: true })
      .eq("agent_id", selected.agentId)
      .eq("from_team", false)
  }

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Support</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
        Agent <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text pr-1 font-serif italic text-transparent">conversations</em>
      </h1>

      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/80 bg-white/70 p-6 text-sm text-[#16151a]/60 backdrop-blur-xl">
          No messages yet. When an agent writes in, it shows up here.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl">
            {list.map((t) => {
              const on = t.agentId === selected?.agentId
              const lastMsg = t.msgs[t.msgs.length - 1]
              return (
                <Link
                  key={t.agentId}
                  href={`/admin/messages?a=${t.agentId}`}
                  className={"block border-b border-[#16151a]/6 px-4 py-3 last:border-0 " + (on ? "bg-white" : "hover:bg-white/60")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#16151a]">{t.name || t.email || "Agent"}</p>
                    {t.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-[#D9467A] px-2 py-0.5 text-[11px] font-semibold text-white">{t.unread}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#16151a]/50">
                    {lastMsg.from_team ? "You: " : ""}{lastMsg.body}
                  </p>
                </Link>
              )
            })}
          </div>

          {selected && (
            <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl">
              <div className="border-b border-[#16151a]/8 px-5 py-4">
                <p className="text-sm font-semibold text-[#16151a]">{selected.name || "Agent"}</p>
                {selected.email && <p className="text-xs text-[#16151a]/50">{selected.email}</p>}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {selected.msgs.map((m) => (
                  <div key={m.id} className={m.from_team ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                        (m.from_team ? "bg-gradient-to-r from-[#D9467A] to-[#EE7C55] text-white" : "bg-white text-[#16151a] shadow-sm")
                      }
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={"mt-1 text-[11px] " + (m.from_team ? "text-white/70" : "text-[#16151a]/40")}>{when(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ReplyForm agentId={selected.agentId} />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
