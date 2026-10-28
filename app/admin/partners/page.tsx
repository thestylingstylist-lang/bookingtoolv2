import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { money, MIN_PAYOUT_CENTS } from "@/lib/partners"
import { approvePartner, declinePartner, markPaid, savePayout } from "./actions"

export const dynamic = "force-dynamic"

type Partner = {
  id: string; name: string; email: string; kind: string; audience: string | null; pitch: string | null
  status: string; code: string | null; dashboard_token: string; payout_method: string | null; created_at: string
}

// Partner program: applications to review, each partner's numbers, and who to pay this month.
export default async function AdminPartners() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const [{ data: partners, error }, { data: clicks }, { data: agents }, { data: comms }] = await Promise.all([
    admin.from("partners").select("id, name, email, kind, audience, pitch, status, code, dashboard_token, payout_method, created_at").order("created_at", { ascending: false }),
    admin.from("partner_clicks").select("partner_id"),
    admin.from("agents").select("referred_by").not("referred_by", "is", null),
    admin.from("partner_commissions").select("partner_id, agent_id, commission_cents, paid_at"),
  ])

  if (error)
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Partners</h1>
        <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-ink/70">
          The partner tables aren&rsquo;t set up yet. Run <code>supabase/partners.sql</code> in Supabase, then refresh.
        </p>
      </main>
    )

  const all = (partners ?? []) as Partner[]
  const pending = all.filter((p) => p.status === "pending")
  const active = all.filter((p) => p.status === "active")
  const count = <T,>(rows: T[] | null, f: (r: T) => boolean) => (rows ?? []).filter(f).length
  const stats = (id: string) => {
    const mine = (comms ?? []).filter((c) => c.partner_id === id)
    const earned = mine.reduce((n, c) => n + c.commission_cents, 0)
    const owed = mine.filter((c) => !c.paid_at).reduce((n, c) => n + c.commission_cents, 0)
    return {
      clicks: count(clicks, (c) => c.partner_id === id),
      signups: count(agents, (a) => a.referred_by === id),
      paying: new Set(mine.map((c) => c.agent_id)).size,
      earned,
      owed,
    }
  }
  const totalOwed = active.reduce((n, p) => n + stats(p.id).owed, 0)

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Partners</h1>
          <p className="mt-1 text-sm text-ink/60">
            Public page: <a href="/partners" className="underline">marvberry.com/partners</a>
          </p>
        </div>
        <div className="rounded-2xl bg-white px-5 py-3 text-right">
          <p className="text-xs text-ink/50">Owed to partners</p>
          <p className="text-2xl font-semibold tabular-nums">{money(totalOwed)}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Applications {pending.length > 0 && <span className="text-[#BC559E]">({pending.length})</span>}</h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-white p-5 text-sm text-ink/60">No new applications.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {p.name} <span className="font-normal text-ink/50">· {p.email}</span>
                  </p>
                  <span className="rounded-full bg-[#FBEDF5] px-3 py-1 text-xs font-medium text-[#93407A]">
                    {p.kind === "coach" ? "Real estate coach" : "Agent influencer"}
                  </span>
                </div>
                <p className="mt-2 text-sm"><span className="text-ink/50">Where:</span> {p.audience}</p>
                {p.pitch && <p className="mt-1 text-sm text-ink/70">{p.pitch}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={approvePartner} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <span className="text-sm text-ink/50">marvberry.com/r/</span>
                    <input name="code" placeholder={p.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)} className="w-40 rounded-lg border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-[#BC559E]" />
                    <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white">Approve and email them</button>
                  </form>
                  <form action={declinePartner}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="rounded-full px-4 py-2 text-sm text-ink/60 hover:bg-ink/5">Decline</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Active partners</h2>
        {active.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-white p-5 text-sm text-ink/60">No partners yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/45">
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-3 py-3 font-medium">Clicks</th>
                  <th className="px-3 py-3 font-medium">Signups</th>
                  <th className="px-3 py-3 font-medium">Paying</th>
                  <th className="px-3 py-3 font-medium">Earned</th>
                  <th className="px-3 py-3 font-medium">Owed</th>
                  <th className="px-5 py-3 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {active.map((p) => {
                  const s = stats(p.id)
                  return (
                    <tr key={p.id} className="border-t border-ink/8 align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-ink/50">/r/{p.code} · {p.kind === "coach" ? "Coach" : "Influencer"}</p>
                        <a href={`/partners/${p.dashboard_token}`} className="text-xs underline text-ink/60">Their page</a>
                      </td>
                      <td className="px-3 py-4 tabular-nums">{s.clicks}</td>
                      <td className="px-3 py-4 tabular-nums">{s.signups}</td>
                      <td className="px-3 py-4 tabular-nums">{s.paying}</td>
                      <td className="px-3 py-4 tabular-nums">{money(s.earned)}</td>
                      <td className="px-3 py-4 tabular-nums font-semibold">{money(s.owed)}</td>
                      <td className="px-5 py-4">
                        <form action={savePayout} className="flex gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <input name="payout" defaultValue={p.payout_method ?? ""} placeholder="PayPal: name@email.com" className="w-48 rounded-lg border border-ink/15 px-3 py-1.5 outline-none focus:border-[#BC559E]" />
                          <button className="rounded-full px-3 py-1.5 text-ink/60 hover:bg-ink/5">Save</button>
                        </form>
                        {s.owed >= MIN_PAYOUT_CENTS ? (
                          <form action={markPaid} className="mt-2">
                            <input type="hidden" name="id" value={p.id} />
                            <button className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-white">I paid {money(s.owed)}</button>
                          </form>
                        ) : (
                          s.owed > 0 && <p className="mt-2 text-xs text-ink/45">Pays out at $25</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink/50">
          Pay partners once a month, then tap &ldquo;I paid&rdquo;. Ask for a W-9 before anyone passes $600 in a year.
        </p>
      </section>
    </main>
  )
}
