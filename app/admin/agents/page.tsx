import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { statusOf, PILL } from "@/lib/admin-status"

export const dynamic = "force-dynamic"

type AgentRow = {
  id: string
  business_name: string | null
  full_name: string | null
  created_at: string
  trial_ends_at: string | null
  subscription_status: string | null
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const { data: agentsData } = await admin
    .from("agents")
    .select("id, business_name, full_name, created_at, trial_ends_at, subscription_status")
    .order("created_at", { ascending: false })
    .limit(1000)

  const allAgents = (agentsData ?? []) as AgentRow[]

  // Map each agent id to its login email via the auth admin API.
  const emailById = new Map<string, string>()
  let page = 1
  while (page <= 10) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    const users = list?.users ?? []
    for (const u of users) if (u.email) emailById.set(u.id, u.email)
    if (users.length < 1000) break
    page++
  }

  // The team account is not a customer.
  const agents = allAgents.filter((a) => !isAdminEmail(emailById.get(a.id)))

  const q = ((await searchParams).q || "").trim().toLowerCase()
  const rows = agents
    .map((a) => ({ ...a, email: emailById.get(a.id) || "" }))
    .filter((a) =>
      !q ||
      a.email.toLowerCase().includes(q) ||
      (a.business_name || "").toLowerCase().includes(q) ||
      (a.full_name || "").toLowerCase().includes(q)
    )

  const counts = {
    total: agents.length,
    paying: agents.filter((a) => statusOf(a).key === "paying").length,
    trial: agents.filter((a) => statusOf(a).key === "trial").length,
    canceled: agents.filter((a) => statusOf(a).key === "canceled").length,
  }

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Agents</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
        Everyone on <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text pr-1 font-serif italic text-transparent">Marvberry</em>
      </h1>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-white/70 px-3.5 py-1.5 backdrop-blur-xl">{counts.total} total</span>
        <span className="rounded-full bg-white/70 px-3.5 py-1.5 backdrop-blur-xl">{counts.paying} paying</span>
        <span className="rounded-full bg-white/70 px-3.5 py-1.5 backdrop-blur-xl">{counts.trial} on trial</span>
        <span className="rounded-full bg-white/70 px-3.5 py-1.5 backdrop-blur-xl">{counts.canceled} canceled</span>
      </div>

      <form className="mt-6 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, business, or email…"
          className="w-full rounded-xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm text-[#16151a] shadow-sm outline-none backdrop-blur-xl placeholder:text-[#16151a]/40 focus:border-[#D9467A]"
        />
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/80 bg-white/60 backdrop-blur-xl">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#16151a]/8 text-xs uppercase tracking-wide text-[#16151a]/45">
            <tr>
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-[#16151a]/50">No agents found.</td></tr>
            )}
            {rows.map((a) => {
              const st = statusOf(a)
              return (
                <tr key={a.id} className="border-b border-[#16151a]/6 transition-colors last:border-0 hover:bg-white">
                  <td className="px-5 py-3.5 font-medium text-[#16151a]">
                    <Link href={`/admin/agents/${a.id}`} className="hover:text-[#D9467A]">{a.business_name || "—"}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#16151a]/70">
                    <Link href={`/admin/agents/${a.id}`} className="hover:text-[#D9467A]">{a.full_name || "—"}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#16151a]/70">{a.email || "—"}</td>
                  <td className="px-5 py-3.5 text-[#16151a]/55">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[st.key]}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/agents/${a.id}`} className="text-sm font-medium text-[#D9467A] hover:underline">Open →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
