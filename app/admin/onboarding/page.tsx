import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import {
  activityFor, buildSteps, statusOf, nextStepLine, isActive, STATUS_LABEL,
  type OnboardingRow, type OnboardingDoc, type StatusKey,
} from "@/lib/onboarding-status"
import ReplyForm from "../messages/reply-form"
import { startOnboarding, setOwner, toggleSetupCall, requestDocs, toggleTemplate, removeDoc, setComplete } from "./actions"

export const dynamic = "force-dynamic"

const GOAL = 3

const PILL: Record<StatusKey, string> = {
  new: "bg-[#16151a]/[0.06] text-[#16151a]/70",
  onboarding: "bg-[#e8eefb] text-[#2b4a8a]",
  nudge: "bg-[#fbe8d6] text-[#8a4b12]",
  active: "bg-[#e3f1e5] text-[#1f5b33]",
  complete: "bg-[#16151a] text-white",
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
}
function day(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
}

const glass = "rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl"

export default async function AdminOnboardingPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const [{ data: obData, error }, { data: docData }, { data: agentData }] = await Promise.all([
    admin.from("onboarding").select("agent_id, created_at, owner, setup_call_done, setup_call_at, completed_at").order("created_at", { ascending: false }),
    admin.from("onboarding_docs").select("id, agent_id, created_at, title, file_path, file_name, uploaded_at, template_built").order("created_at", { ascending: true }),
    admin.from("agents").select("id, full_name, business_name, created_at").order("created_at", { ascending: false }).limit(1000),
  ])

  if (error) {
    return (
      <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
        <h1 className="text-4xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The onboarding tables aren&apos;t set up yet. Run supabase/onboarding.sql in Supabase, then refresh.
        </p>
      </main>
    )
  }

  const rows = (obData ?? []) as OnboardingRow[]
  const docs = (docData ?? []) as OnboardingDoc[]
  const agents = (agentData ?? []) as { id: string; full_name: string; business_name: string }[]
  const nameOf = (id: string) => {
    const a = agents.find((x) => x.id === id)
    return a?.full_name || a?.business_name || "Realtor"
  }
  const firstOf = (id: string) => nameOf(id).trim().split(/\s+/)[0]

  const activity = await activityFor(admin, rows.map((r) => r.agent_id))
  const now = Date.now()
  const view = rows.map((r) => {
    const act = activity.get(r.agent_id)!
    const myDocs = docs.filter((d) => d.agent_id === r.agent_id)
    const steps = buildSteps(r, myDocs, act)
    const status = statusOf(r, act, now)
    return { row: r, act, docs: myDocs, steps, status, active: isActive(act, now) }
  })

  const activeCount = view.filter((v) => v.active).length
  const inOnboarding = view.filter((v) => v.status !== "complete").length
  const nudgeCount = view.filter((v) => v.status === "nudge").length
  const notYet = agents.filter((a) => !rows.some((r) => r.agent_id === a.id))

  const selectedId = (await searchParams).a || view.find((v) => v.status !== "complete")?.row.agent_id || view[0]?.row.agent_id
  const sel = view.find((v) => v.row.agent_id === selectedId)

  let thread: { id: string; body: string; from_team: boolean; created_at: string }[] = []
  if (sel) {
    const { data } = await admin
      .from("support_messages")
      .select("id, body, from_team, created_at")
      .eq("agent_id", sel.row.agent_id)
      .order("created_at", { ascending: true })
      .limit(500)
    thread = data ?? []
    if (thread.some((m) => !m.from_team)) {
      await admin.from("support_messages").update({ read_by_team: true }).eq("agent_id", sel.row.agent_id).eq("from_team", false)
    }
  }

  const stat = (label: string, value: number) => (
    <div className={`${glass} p-5`}>
      <p className="text-xs font-medium text-[#16151a]/55">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-[#16151a]">{value}</p>
    </div>
  )

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Sales · Onboarding</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
            Every realtor,{" "}
            <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text pr-1 font-serif italic text-transparent">up and running</em>
          </h1>
          <p className="mt-2 text-sm text-[#16151a]/60">From signed up to actively using Marvberry. Whoever ran the setup call owns it.</p>
        </div>
        {notYet.length > 0 && (
          <form action={startOnboarding} className={`${glass} flex flex-wrap items-end gap-2 p-3`}>
            <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
              Realtor
              <select name="agent_id" required className="rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]">
                {notYet.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name || a.business_name || "Unnamed realtor"}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
              Owner
              <input name="owner" defaultValue="Alecia" className="w-28 rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]" />
            </label>
            <button className="rounded-full bg-[#16151a] px-4 py-2 text-sm font-medium text-white">+ Add realtor</button>
          </form>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#16151a] p-5 text-white">
          <p className="text-xs font-medium text-white/60">Goal: {GOAL} active realtors</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight">{activeCount} of {GOAL}</p>
          <div className="mt-3 h-1.5 rounded-full bg-white/15">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#D9467A] to-[#EE7C55]" style={{ width: `${Math.min(100, (activeCount / GOAL) * 100)}%` }} />
          </div>
        </div>
        {stat("In onboarding", inOnboarding)}
        {stat("Needs a nudge", nudgeCount)}
        {stat("Active", activeCount)}
      </div>

      {view.length === 0 ? (
        <p className={`${glass} mt-8 p-6 text-sm text-[#16151a]/60`}>
          No one in onboarding yet. Add a realtor above after their setup call is booked.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className={`${glass} overflow-x-auto p-1`}>
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-[#16151a]/40">
                    <th className="px-4 py-3">Realtor</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="whitespace-nowrap px-4 py-3">Last activity</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16151a]/5">
                  {view.map((v) => {
                    const on = v.row.agent_id === sel?.row.agent_id
                    const href = `/admin/onboarding?a=${v.row.agent_id}`
                    return (
                      <tr key={v.row.agent_id} className={on ? "bg-white" : "hover:bg-white/60"}>
                        <td className="px-4 py-3.5">
                          <Link href={href} className="whitespace-nowrap font-semibold text-[#16151a] hover:underline">{nameOf(v.row.agent_id)}</Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#16151a]/75">{v.row.owner}</td>
                        <td className="px-4 py-3.5">
                          <Link href={href} className="flex gap-1" aria-label={`${v.steps.filter((s) => s.done).length} of ${v.steps.length} steps done`}>
                            {v.steps.map((s) => (
                              <span key={s.key} className={`h-1.5 w-5 rounded-full ${s.done ? "bg-[#16151a]" : "bg-[#16151a]/12"}`} />
                            ))}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#16151a]/60">{day(v.act.lastActivity)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[v.status]}`}>{STATUS_LABEL[v.status]}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {sel && (
              <div className={`${glass} flex min-h-[360px] flex-col`}>
                <div className="border-b border-[#16151a]/8 px-5 py-4">
                  <p className="text-sm font-semibold text-[#16151a]">Chat with {firstOf(sel.row.agent_id)}</p>
                  <p className="text-xs text-[#16151a]/50">
                    {sel.status === "complete" ? "Now their regular Support chat." : "Shows on their home page while they're onboarding. Becomes their Support chat after."}
                  </p>
                </div>
                <div className="max-h-[420px] flex-1 space-y-3 overflow-y-auto p-5">
                  {thread.length === 0 && <p className="text-sm text-[#16151a]/50">No messages yet. Say hello. It shows in their Marvberry and goes to their email.</p>}
                  {thread.map((m) => (
                    <div key={m.id} className={m.from_team ? "flex justify-end" : "flex justify-start"}>
                      <div className={"max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " + (m.from_team ? "bg-gradient-to-r from-[#D9467A] to-[#EE7C55] text-white" : "bg-white text-[#16151a] shadow-sm")}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={"mt-1 text-[11px] " + (m.from_team ? "text-white/70" : "text-[#16151a]/40")}>{when(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <ReplyForm agentId={sel.row.agent_id} first={thread.length === 0} />
              </div>
            )}
          </div>

          {sel && (
            <aside className={`${glass} flex flex-col gap-5 p-6`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#16151a]">{nameOf(sel.row.agent_id)}</h2>
                  <p className="mt-0.5 text-xs text-[#16151a]/55">
                    Step {Math.min(sel.steps.filter((s) => s.done).length + 1, sel.steps.length)} of {sel.steps.length}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[sel.status]}`}>{STATUS_LABEL[sel.status]}</span>
              </div>

              <form action={setOwner} className="flex items-center gap-2 text-sm">
                <input type="hidden" name="agent_id" value={sel.row.agent_id} />
                <label htmlFor="owner" className="text-[#16151a]/55">Owner</label>
                <input id="owner" name="owner" defaultValue={sel.row.owner} className="w-32 rounded-lg border border-[#16151a]/15 bg-white px-2.5 py-1 text-sm" />
                <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#16151a]/60 hover:bg-white">Save</button>
              </form>

              <ul className="space-y-3">
                {sel.steps.map((s) => (
                  <li key={s.key} className="flex items-start gap-3 text-sm">
                    {s.key === "call" ? (
                      <form action={toggleSetupCall}>
                        <input type="hidden" name="agent_id" value={sel.row.agent_id} />
                        <input type="hidden" name="done" value={s.done ? "0" : "1"} />
                        <button aria-label={s.done ? "Mark setup call not done" : "Mark setup call done"} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${s.done ? "border-[#16151a] bg-[#16151a] text-white" : "border-[#16151a]/30 bg-white hover:border-[#16151a]"}`}>
                          {s.done && <Check />}
                        </button>
                      </form>
                    ) : (
                      <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${s.done ? "border-[#16151a] bg-[#16151a] text-white" : "border-[#16151a]/25"}`}>
                        {s.done && <Check />}
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-[#16151a]">
                        {s.title}
                        {s.team && <span className="ml-2 rounded-full bg-[#16151a]/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#16151a]/55">Team</span>}
                      </p>
                      <p className="text-xs text-[#16151a]/50">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-[#EE7C55]/25 bg-[#fff7f0] p-4 text-sm">
                <p className="font-semibold text-[#16151a]">Next step</p>
                <p className="mt-1 text-[#16151a]/75">{nextStepLine(firstOf(sel.row.agent_id), sel.steps, sel.status)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#16151a]/45">Documents</p>
                {sel.docs.length === 0 ? (
                  <p className="mt-2 text-sm text-[#16151a]/55">Nothing requested yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#16151a]/6">
                    {sel.docs.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-[#16151a]">{d.title}</p>
                          {d.file_path ? (
                            <a href={`/admin/onboarding/file/${d.id}`} target="_blank" rel="noreferrer" className="text-xs text-[#D9467A] hover:underline">
                              Open {d.file_name || "file"} · {day(d.uploaded_at)}
                            </a>
                          ) : (
                            <p className="text-xs text-[#16151a]/50">Requested · waiting</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {d.file_path && (
                            <form action={toggleTemplate}>
                              <input type="hidden" name="doc_id" value={d.id} />
                              <input type="hidden" name="built" value={d.template_built ? "0" : "1"} />
                              <button className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${d.template_built ? "bg-[#e3f1e5] text-[#1f5b33]" : "bg-[#16151a] text-white"}`}>
                                {d.template_built ? "Template built ✓" : "Mark template built"}
                              </button>
                            </form>
                          )}
                          <form action={removeDoc}>
                            <input type="hidden" name="doc_id" value={d.id} />
                            <button aria-label={`Remove ${d.title}`} className="rounded-full px-2 py-1 text-xs text-[#16151a]/40 hover:bg-white hover:text-[#16151a]">✕</button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {sel.status !== "complete" && (
                  <form action={requestDocs} className="mt-3">
                    <input type="hidden" name="agent_id" value={sel.row.agent_id} />
                    <label htmlFor="titles" className="text-xs font-medium text-[#16151a]/60">Request documents, one per line</label>
                    <textarea id="titles" name="titles" rows={3} placeholder={"Buyer agreement\nDisclosures"} className="mt-1 w-full resize-none rounded-xl border border-[#16151a]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#D9467A]" />
                    <button className="mt-2 rounded-full bg-[#16151a] px-4 py-2 text-sm font-medium text-white">Request and email them</button>
                  </form>
                )}
              </div>

              <form action={setComplete} className="border-t border-[#16151a]/8 pt-4">
                <input type="hidden" name="agent_id" value={sel.row.agent_id} />
                <input type="hidden" name="done" value={sel.row.completed_at ? "0" : "1"} />
                {sel.row.completed_at ? (
                  <>
                    <p className="text-sm text-[#16151a]/60">Completed {day(sel.row.completed_at)}. The setup card is off their home page.</p>
                    <button className="mt-2 text-xs font-medium text-[#16151a]/55 underline underline-offset-4">Reopen onboarding</button>
                  </>
                ) : (
                  <>
                    <button className="w-full rounded-full border border-[#16151a]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#16151a] hover:border-[#16151a]">
                      Mark onboarding complete
                    </button>
                    <p className="mt-2 text-xs text-[#16151a]/50">Removes the setup card from their home page. The chat stays as their Support chat.</p>
                  </>
                )}
              </form>
            </aside>
          )}
        </div>
      )}
    </main>
  )
}

function Check() {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5l2.2 2.2L9.5 3.5" />
    </svg>
  )
}
