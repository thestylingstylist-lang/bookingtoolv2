// Right after signup: the agent picks how to get started. No upsell here.
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Get started · Marvberry", robots: { index: false } }

export default async function GetStarted() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/signup")
  const { data: agent } = await supabase.from("agents").select("full_name").eq("id", user.id).maybeSingle()
  const first = ((agent?.full_name as string) || "").trim().split(" ")[0]

  return (
    <main className="gs">
      <style>{CSS}</style>
      <div className="glow" aria-hidden />
      <section className="in">
        <img className="berry" src="/brand/berry-clear.webp" alt="" />
        <h1>You’re in{first ? `, ${first}` : ""}. How would you like to get started?</h1>
        <div className="cards">
          <a className="card main" href="/dashboard?welcome=1">
            <span className="t">Set it up myself</span>
            <span className="d">Meet Marvberry and get your first task done in a few minutes.</span>
            <span className="go">Start now <span aria-hidden>&rarr;</span></span>
          </a>
          <a className="card" href="/chat?welcome=1">
            <span className="t">Set it up with us</span>
            <span className="d">Book a free call, and we’ll set up Marvberry with you.</span>
            <span className="go">Book a free call <span aria-hidden>&rarr;</span></span>
          </a>
        </div>
      </section>
    </main>
  )
}

const CSS = `
.gs{position:relative;min-height:100svh;display:grid;place-items:center;overflow:hidden;background:#F8F8F8;color:#16151a;padding:32px 16px;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.gs *{box-sizing:border-box}
.gs .glow{position:absolute;inset:-20% -10% auto;height:70%;background:radial-gradient(50% 60% at 30% 30%,#ffe3ef,transparent 70%),radial-gradient(45% 55% at 75% 35%,#ece6ff,transparent 70%);filter:blur(30px);opacity:.8}
.gs .in{position:relative;width:min(760px,100%);text-align:center}
.gs .berry{width:92px;height:auto;margin:0 auto 18px;display:block;animation:gsF 5s ease-in-out infinite}
.gs h1{margin:0;font-size:clamp(28px,1rem + 2.4vw,44px);font-weight:650;letter-spacing:-.035em;line-height:1.1;text-wrap:balance}
.gs .cards{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left}
.gs .card{display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid rgba(22,21,26,.08);border-radius:26px;padding:26px 24px;color:inherit;text-decoration:none;box-shadow:0 30px 60px -45px rgba(22,21,26,.35);transition:transform .2s,box-shadow .2s}
.gs .card:hover{transform:translateY(-2px);box-shadow:0 36px 70px -40px rgba(22,21,26,.4)}
.gs .card.main{border-color:#efc9df}
.gs .t{font-size:20px;font-weight:650;letter-spacing:-.02em}
.gs .d{font-size:15.5px;line-height:1.5;color:#5f5d66;flex:1}
.gs .go{margin-top:8px;align-self:flex-start;font-size:14.5px;font-weight:600;border-radius:999px;padding:11px 18px;background:#EEEEF1}
.gs .main .go{background:#16151a;color:#fff}
@keyframes gsF{50%{transform:translateY(-6px)}}
@media (max-width:640px){.gs .cards{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.gs *{animation:none!important;transition:none!important}}
`
