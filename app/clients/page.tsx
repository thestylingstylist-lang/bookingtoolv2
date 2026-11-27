import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import { addClient } from "./actions"
import ClientRow, { type Priority } from "./client-row"
import { loadAssistantName } from "@/lib/assistant-name"
import NotifyBand from "./notify-band"

import { STAGES, STAGE_LABEL, type Stage, loadDeals, loadFollowUps, followUpLine } from "@/lib/business-picture"
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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; deleted?: string; error?: string; stage?: string; view?: string }>
}) {
  const params = await searchParams
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
  const assistantName = await loadAssistantName(supabase, user.id)

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, address, created_at")
    .order("created_at", { ascending: false })
  const all = (data ?? []) as Client[]

  // Priority jackets: anyone with new activity, then anyone she's following up with,
  // newest first. Everyone else keeps their usual place.
  const { data: actRows, error: actErr } = await supabase
    .from("client_activity")
    .select("client_id, line, created_at")
    .is("seen_at", null)
    .order("created_at", { ascending: false })
    .limit(500)
  const fresh = new Map<string, { line: string; at: string; count: number }>()
  for (const r of (actErr ? [] : (actRows ?? [])) as { client_id: string; line: string; created_at: string }[]) {
    const f = fresh.get(r.client_id)
    if (f) f.count++
    else fresh.set(r.client_id, { line: r.line, at: r.created_at, count: 1 })
  }
  const { data: fuRows, error: fuErr } = await supabase.from("clients").select("id, follow_up_at").not("follow_up_at", "is", null)
  const following = new Map((fuErr ? [] : ((fuRows ?? []) as { id: string; follow_up_at: string }[])).map((r) => [r.id, r.follow_up_at]))
  const { data: lastRows, error: lastErr } = following.size
    ? await supabase.from("client_activity").select("client_id, line, created_at").in("client_id", [...following.keys()]).order("created_at", { ascending: false }).limit(200)
    : { data: [], error: null }
  const lastLine = new Map<string, string>()
  for (const r of (lastErr ? [] : (lastRows ?? [])) as { client_id: string; line: string }[]) if (!lastLine.has(r.client_id)) lastLine.set(r.client_id, r.line)
  const priorityOf = (c: Client): Priority | null => {
    const f = fresh.get(c.id)
    if (f) return { line: f.count > 1 ? `${f.line}, and ${f.count - 1} more` : f.line, fresh: true, follow: following.has(c.id), at: f.at }
    if (following.has(c.id)) return { line: lastLine.get(c.id) || "Kept for follow-up", fresh: false, follow: true, at: following.get(c.id)! }
    return null
  }
  const rows = all.map((c) => ({ c, p: priorityOf(c) }))
  const top = rows.filter((r) => r.p).sort((a, b) => Number(b.p!.fresh) - Number(a.p!.fresh) || Date.parse(b.p!.at) - Date.parse(a.p!.at))
  const ordered = [...top, ...rows.filter((r) => !r.p)]

  // Opened from the dashboard boxes: deals by stage, or follow-ups due.
  const stageParam = params.stage && (params.stage === "all" || (STAGES as readonly string[]).includes(params.stage)) ? params.stage : ""
  const followView = params.view === "follow-up"
  const deals = stageParam ? await loadDeals(supabase) : null
  const follow = followView ? await loadFollowUps(supabase, agent.timezone || "America/New_York") : null
  const stageCount = new Map<Stage, number>()
  if (deals) for (const st of deals.values()) stageCount.set(st, (stageCount.get(st) ?? 0) + 1)
  let shown = ordered
  if (deals) shown = shown.filter((r) => deals.has(r.c.id) && (stageParam === "all" || deals.get(r.c.id) === stageParam))
  if (follow)
    shown = shown
      .filter((r) => follow.has(r.c.id))
      .map((r) => ({ c: r.c, p: { line: followUpLine(follow.get(r.c.id)!), fresh: !!r.p?.fresh, follow: follow.get(r.c.id)!.kept, at: r.p?.at || "" } as Priority }))
  const clients = all

  // Notifications are offered once, after the first client. Hidden until the
  // database knows about them, so "Not now" always sticks.
  const { data: asked, error: askedErr } = await supabase.from("agents").select("notify_prompt").eq("id", user.id).maybeSingle()
  const offerNotify = clients.length > 0 && !askedErr && !asked?.notify_prompt

  const inputClass =
    "w-full rounded-lg border border-lxink/15 bg-white px-3 py-2 text-sm outline-none focus:border-lxgold"

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <p className="text-sm font-medium tracking-wide text-lxgold">Clients</p>
        <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">Your people</h1>

        {params.added && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client added. Open them to send their suite link.
          </p>
        )}
        {offerNotify && <NotifyBand letter={assistantName} />}
        {params.updated && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client updated.
          </p>
        )}
        {params.deleted && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client deleted, with their steps, documents and messages.
          </p>
        )}
        {params.error === "delete" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            That client didn&rsquo;t delete. Refresh the page and try again.
          </p>
        )}
        {params.error === "name" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Add a first or last name, then save.
          </p>
        )}
        {params.error === "save" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            That client didn&rsquo;t save. Check the details and try again.
          </p>
        )}

        {/* Add a client */}
        <form
          action={addClient}
          className="mt-8 rounded-2xl border border-lxink/10 bg-card p-6"
        >
          <h2 className="font-serif font-semibold tracking-tight text-xl">Add a client</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-lxink/60">First name</label>
              <input name="firstName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Last name</label>
              <input name="lastName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Email</label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Phone</label>
              <input name="phone" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-lxink/60">Address</label>
              <input name="address" className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 rounded-lg bg-lxink px-5 py-2.5 text-sm font-medium text-lxbg transition-opacity hover:opacity-90"
          >
            Add client
          </button>
        </form>

        {/* List */}
        {(deals || follow) && (
          <nav aria-label="Filter" className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
            {deals ? (
              <>
                <span className="text-[11px] uppercase tracking-[.12em] text-lxink/55">Deals</span>
                <Link href="/clients?stage=all" className={`no-underline ${stageParam === "all" ? "border-b border-lxgold text-lxink" : "text-lxink/60 hover:text-lxink"}`}>
                  All {deals.size}
                </Link>
                {STAGES.filter((st) => stageCount.get(st)).map((st) => (
                  <Link key={st} href={`/clients?stage=${st}`} className={`no-underline ${stageParam === st ? "border-b border-lxgold text-lxink" : "text-lxink/60 hover:text-lxink"}`}>
                    {STAGE_LABEL[st]} {stageCount.get(st)}
                  </Link>
                ))}
              </>
            ) : (
              <span className="text-[11px] uppercase tracking-[.12em] text-lxink/55">Follow-ups due &middot; {shown.length}</span>
            )}
            <Link href="/clients" className="ml-auto text-lxink/60 no-underline hover:text-lxink">Show everyone</Link>
          </nav>
        )}
        {!deals && !follow && top.some((r) => r.p!.fresh) && (
          <p className="mt-8 flex items-center gap-2.5 text-sm text-lxink">
            <span className="h-[8px] w-[8px] rounded-full bg-lxgold" aria-hidden="true" />
            {(() => {
              const n = top.filter((r) => r.p!.fresh).length
              return n === 1 ? "One client did something new. They're at the top." : `${n} clients did something new. They're at the top.`
            })()}
          </p>
        )}
        {clients.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-lxink/10 bg-card p-10 text-center">
            <h2 className="font-serif font-semibold tracking-tight text-xl">No clients yet.</h2>
            <p className="mt-2 text-lxink/60">
              Add your first one above, and {assistantName} will take it from there.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-lxink/10 bg-card">
            <table className="stack-sm w-full text-left text-sm">
              <thead className="border-b border-lxink/10 text-lxink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Address</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-lxink/60">{follow ? "No follow-ups due. You're caught up." : "No one at this stage right now."}</td>
                  </tr>
                )}
                {shown.map(({ c, p }) => (
                  <ClientRow key={c.id} client={c} priority={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppShell>
  )
}
