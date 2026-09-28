import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { statusOf, fmtDate, MONTHLY_PRICE } from "@/lib/admin-status"
import GoalForm from "./goal-form"

export const dynamic = "force-dynamic"

type Agent = {
  id: string
  business_name: string | null
  full_name: string | null
  created_at: string
  trial_ends_at: string | null
  subscription_status: string | null
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US")

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const now = new Date()
  // Marvberry's year starts in October: Q1 Oct–Dec, Q2 Jan–Mar, Q3 Apr–Jun, Q4 Jul–Sep.
  const m = now.getMonth()
  const q = Math.floor(((m - 9 + 12) % 12) / 3) + 1
  const fyStart = m >= 9 ? now.getFullYear() : now.getFullYear() - 1
  const qStartMonth = (9 + (q - 1) * 3) % 12
  const qYear = qStartMonth >= 9 ? fyStart : fyStart + 1
  const qStart = new Date(qYear, qStartMonth, 1)
  const qEnd = new Date(qYear, qStartMonth + 3, 1)
  const mon = (d: Date) => d.toLocaleString("en-US", { month: "short" })
  const qMonths = `${mon(qStart)}–${mon(new Date(qYear, qStartMonth + 2, 1))} ${qYear}`
  const daysLeft = Math.max(0, Math.ceil((qEnd.getTime() - now.getTime()) / 86400000))
  const goalKey = `goal:fy${fyStart}-Q${q}`
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const admin = createAdminClient()
  const [agentsRes, usersRes, unreadRes, feedbackRes, goalRes] = await Promise.all([
    admin.from("agents").select("id, business_name, full_name, created_at, trial_ends_at, subscription_status"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("support_messages").select("id", { count: "exact", head: true }).eq("from_team", false).eq("read_by_team", false),
    admin.from("feedback").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    admin.from("admin_settings").select("value").eq("key", goalKey).maybeSingle(),
  ])

  // Leave the team account out — it isn't a customer.
  const teamIds = new Set(
    (usersRes.data?.users ?? []).filter((u: any) => isAdminEmail(u.email)).map((u: any) => u.id as string),
  )
  const agents = ((agentsRes.data ?? []) as Agent[]).filter((a) => !teamIds.has(a.id))
  const withStatus = agents.map((a) => ({ ...a, st: statusOf(a) }))
  const count = (k: string) => withStatus.filter((a) => a.st.key === k).length

  const paying = count("paying")
  const mrr = paying * MONTHLY_PRICE
  const projected = mrr * 3
  const goal = goalRes.data?.value != null ? Number(goalRes.data.value) : null
  const pct = goal && goal > 0 ? Math.min(100, (projected / goal) * 100) : 0
  const payingNeeded = goal ? Math.ceil(goal / (MONTHLY_PRICE * 3)) : 0
  const moreNeeded = Math.max(0, payingNeeded - paying)

  const newThisQuarter = agents.filter((a) => new Date(a.created_at) >= qStart).length
  const recent = withStatus.slice().sort((x, y) => (x.created_at < y.created_at ? 1 : -1)).slice(0, 6)
  const soon = now.getTime() + 7 * 86400000
  const endingSoon = withStatus
    .filter((a) => a.st.key === "trial" && a.trial_ends_at && new Date(a.trial_ends_at).getTime() <= soon)
    .sort((x, y) => (x.trial_ends_at! < y.trial_ends_at! ? -1 : 1))

  const unread = unreadRes.count ?? 0
  const newFeedback = feedbackRes.count ?? 0

  const Stat = ({ label, value, href, accent }: { label: string; value: React.ReactNode; href?: string; accent?: boolean }) => {
    const inner = (
      <div className={"h-full rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-xl " + (href ? "transition-colors hover:bg-white" : "")}>
        <p className="text-xs font-medium text-[#16151a]/50">{label}</p>
        <p className={"mt-1 text-3xl font-semibold " + (accent ? "text-[#D9467A]" : "text-[#16151a]")}>{value}</p>
      </div>
    )
    return href ? <Link href={href}>{inner}</Link> : inner
  }

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Dashboard</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
        How Marvberry is{" "}
        <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text pr-1 font-serif italic text-transparent">doing</em>
      </h1>

      {/* Money + goal */}
      <section className="mt-8 rounded-3xl border border-white/80 bg-white/75 p-6 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16151a]/45">Monthly revenue</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-[#16151a]">{money(mrr)}</p>
            <p className="mt-1 text-sm text-[#16151a]/55">
              {paying} paying × {money(MONTHLY_PRICE)}/month
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16151a]/45">
              Q{q} goal · {qMonths}
            </p>
            <p className="mt-1 text-3xl font-semibold text-[#16151a]">{goal != null ? money(goal) : "Not set"}</p>
            <div className="mt-2 flex justify-end">
              <GoalForm goalKey={goalKey} current={goal} />
            </div>
          </div>
        </div>

        {goal != null && (
          <div className="mt-6">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#16151a]/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#D9467A] to-[#EE7C55]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-[#16151a]/65">
                On pace for <strong className="text-[#16151a]">{money(projected)}</strong> this quarter · {Math.round(pct)}% of goal
              </span>
              <span className="text-[#16151a]/55">{daysLeft} days left in Q{q}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-[#16151a]">
              {moreNeeded === 0
                ? "You’re on pace to hit it."
                : `${moreNeeded} more paying ${moreNeeded === 1 ? "agent" : "agents"} gets you there.`}
            </p>
          </div>
        )}
      </section>

      {/* Counts */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total agents" value={agents.length} href="/admin/agents" />
        <Stat label="Paying" value={paying} href="/admin/agents" />
        <Stat label="On trial" value={count("trial")} href="/admin/agents" />
        <Stat label="Trial ended" value={count("expired")} href="/admin/agents" />
        <Stat label="Canceled" value={count("canceled")} href="/admin/agents" />
        <Stat label={`New in Q${q}`} value={newThisQuarter} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="Unread support messages" value={unread} href="/admin/messages" accent={unread > 0} />
          <Stat label="Feedback this week" value={newFeedback} href="/admin/feedback" />
        </div>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16151a]/45">Trials ending this week</h2>
          {endingSoon.length === 0 ? (
            <p className="mt-3 text-sm text-[#16151a]/45">None this week.</p>
          ) : (
            <ul className="mt-2">
              {endingSoon.map((a) => (
                <li key={a.id} className="border-b border-[#16151a]/6 py-2 last:border-0">
                  <Link href={`/admin/agents/${a.id}`} className="flex justify-between gap-3 text-sm hover:text-[#D9467A]">
                    <span className="truncate font-medium">{a.business_name || a.full_name || "Agent"}</span>
                    <span className="shrink-0 text-[#16151a]/55">{fmtDate(a.trial_ends_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16151a]/45">Newest signups</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-[#16151a]/45">No signups yet.</p>
          ) : (
            <ul className="mt-2">
              {recent.map((a) => (
                <li key={a.id} className="border-b border-[#16151a]/6 py-2 last:border-0">
                  <Link href={`/admin/agents/${a.id}`} className="flex justify-between gap-3 text-sm hover:text-[#D9467A]">
                    <span className="truncate font-medium">{a.business_name || a.full_name || "Agent"}</span>
                    <span className="shrink-0 text-[#16151a]/55">{a.st.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
