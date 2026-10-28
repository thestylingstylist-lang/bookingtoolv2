import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { money, MIN_PAYOUT_CENTS } from "@/lib/partners"
import CopyLink from "./copy-link"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: { absolute: "Your partner page — Marvberry" }, robots: { index: false, follow: false } }

// A partner's private page (from the link in their welcome email): their link, clicks, signups, earnings.
export default async function PartnerDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()
  const admin = createAdminClient()
  const { data: p } = await admin
    .from("partners")
    .select("id, name, code, status, commission_pct, commission_months, trial_days")
    .eq("dashboard_token", token)
    .maybeSingle()
  if (!p || p.status !== "active" || !p.code) notFound()

  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ count: clicks }, { count: clicks30 }, { data: agents }, { data: comms }] = await Promise.all([
    admin.from("partner_clicks").select("id", { count: "exact", head: true }).eq("partner_id", p.id),
    admin.from("partner_clicks").select("id", { count: "exact", head: true }).eq("partner_id", p.id).gte("created_at", since),
    admin.from("agents").select("id, full_name, referred_at, subscription_status").eq("referred_by", p.id).order("referred_at", { ascending: false }),
    admin.from("partner_commissions").select("agent_id, commission_cents, created_at, paid_at").eq("partner_id", p.id).order("created_at", { ascending: false }),
  ])

  const list = comms ?? []
  const earned = list.reduce((n, c) => n + c.commission_cents, 0)
  const paid = list.filter((c) => c.paid_at).reduce((n, c) => n + c.commission_cents, 0)
  const owed = earned - paid
  const paying = new Set(list.map((c) => c.agent_id)).size
  const short = (n: string | null) => {
    const [f, l] = String(n ?? "").trim().split(/\s+/)
    return f ? `${f}${l ? ` ${l[0]}.` : ""}` : "An agent"
  }
  const link = `https://www.marvberry.com/r/${p.code}`
  const first = String(p.name).split(" ")[0]

  return (
    <div className="mbpd">
      <style>{CSS}</style>
      <div aria-hidden className="glow" />
      <header className="nav">
        <a href="/"><img src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} style={{ height: 24, width: "auto" }} /></a>
        <span className="pill">Partner</span>
      </header>
      <main>
        <h1>Hi {first}.</h1>
        <p className="sub">
          Here&rsquo;s how your link is doing. You earn {p.commission_pct}% of every payment for each agent&rsquo;s first{" "}
          {p.commission_months} months{p.trial_days ? `, and your people get ${p.trial_days} days free` : ""}.
        </p>

        <div className="linkbox">
          <p className="k">Your link</p>
          <CopyLink link={link} />
          <p className="hint">When you share it, say it&rsquo;s an affiliate link. For example: &ldquo;I get a commission if you sign up.&rdquo;</p>
        </div>

        <div className="stats">
          <div><p className="n">{clicks30 ?? 0}</p><p className="l">Clicks, last 30 days</p><p className="s">{clicks ?? 0} all time</p></div>
          <div><p className="n">{agents?.length ?? 0}</p><p className="l">Signups</p><p className="s">{paying} paying</p></div>
          <div><p className="n">{money(earned)}</p><p className="l">Earned</p><p className="s">{money(paid)} paid to you</p></div>
          <div className="owed"><p className="n">{money(owed)}</p><p className="l">Coming to you</p><p className="s">{owed >= MIN_PAYOUT_CENTS ? "In your next monthly payout" : "Paid once it reaches $25"}</p></div>
        </div>

        <section className="table">
          <h2>Your agents</h2>
          {agents && agents.length ? (
            <ul>
              {agents.map((a) => {
                const mine = list.filter((c) => c.agent_id === a.id)
                const sum = mine.reduce((n, c) => n + c.commission_cents, 0)
                return (
                  <li key={a.id}>
                    <span className="who">{short(a.full_name)}</span>
                    <span className="st">{mine.length ? `${mine.length} of ${p.commission_months} payments` : "On free trial"}</span>
                    <span className="amt">{money(sum)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="empty">No signups yet. Share your link and they&rsquo;ll show up here.</p>
          )}
        </section>
        <p className="help">Questions or a change to how you&rsquo;re paid? Email team@marvberry.com.</p>
      </main>
    </div>
  )
}

const CSS = `
.mbpd{position:relative;isolation:isolate;min-height:100vh;background:#fff;color:#16151a;overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.mbpd *{box-sizing:border-box}
.mbpd h1,.mbpd h2,.mbpd p,.mbpd ul{margin:0;padding:0}
.mbpd .glow{position:absolute;inset:0 0 auto;height:700px;z-index:-1;pointer-events:none;
  background:radial-gradient(40% 50% at 15% 5%,#ffe3ef,transparent 70%),radial-gradient(35% 45% at 85% 0%,#ffe8d8,transparent 70%),radial-gradient(40% 40% at 60% 55%,#efe9ff,transparent 70%)}
.mbpd .nav{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(16px,5vw,64px)}
.mbpd .pill{font-size:13px;font-weight:600;padding:6px 12px;border-radius:999px;background:#FBEDF5;color:#93407A}
.mbpd main{max-width:960px;margin:0 auto;padding:clamp(32px,6vw,64px) 16px 64px}
.mbpd h1{font-size:clamp(36px,1rem + 3vw,56px);letter-spacing:-.04em;font-weight:650}
.mbpd .sub{margin-top:12px;font-size:17px;line-height:1.6;color:#55535b;max-width:40rem}
.mbpd .linkbox{margin-top:32px;padding:24px;border-radius:24px;background:rgba(255,255,255,.85);border:1px solid rgba(188,85,158,.2)}
.mbpd .k{font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#BC559E}
.mbpd .hint{margin-top:12px;font-size:14px;color:#8d8b92}
.mbpd .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
.mbpd .stats>div{padding:20px;border-radius:20px;background:#f6f5f3}
.mbpd .stats .owed{background:#16151a;color:#fff}
.mbpd .n{font-size:30px;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.mbpd .l{margin-top:4px;font-size:14px;font-weight:550}
.mbpd .s{margin-top:2px;font-size:13px;opacity:.6}
.mbpd .table{margin-top:40px}
.mbpd h2{font-size:22px;letter-spacing:-.02em;font-weight:620}
.mbpd .table ul{list-style:none;margin-top:12px;border-top:1px solid rgba(22,21,26,.09)}
.mbpd .table li{display:grid;grid-template-columns:1fr auto 90px;gap:16px;padding:14px 0;border-bottom:1px solid rgba(22,21,26,.09);font-size:15px}
.mbpd .st{color:#8d8b92}
.mbpd .amt{text-align:right;font-variant-numeric:tabular-nums;font-weight:550}
.mbpd .empty{margin-top:12px;padding:20px;border-radius:16px;background:#f6f5f3;color:#55535b;font-size:15px}
.mbpd .help{margin-top:28px;font-size:14px;color:#8d8b92}
@media (max-width:720px){.mbpd .stats{grid-template-columns:1fr 1fr}.mbpd .table li{grid-template-columns:1fr auto}.mbpd .st{display:none}}
`
