import type { Metadata } from "next"
import ApplyForm from "./apply-form"
import { COMMISSION_PCT, COMMISSION_MONTHS, COACH_TRIAL_DAYS, REF_DAYS } from "@/lib/partners"

export const metadata: Metadata = {
  title: { absolute: "Partner program — Marvberry" },
  description: `Share Marvberry with the agents you know. Earn ${COMMISSION_PCT}% for their first ${COMMISSION_MONTHS} months while they stay paying.`,
}

// Public page for the partner (affiliate) program: agent influencers and real estate coaches.
export default function PartnersPage() {
  return (
    <div className="mbp">
      <style>{CSS}</style>
      <div aria-hidden className="glow" />

      <header className="nav">
        <a href="/">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} style={{ height: 24, width: "auto" }} />
        </a>
        <a className="btn sm" href="#apply">Apply</a>
      </header>

      <section className="hero">
        <p className="chip"><span className="dot" />Partner program</p>
        <h1>
          Share Marvberry. <span className="grad">Earn {COMMISSION_PCT}% for a year.</span>
        </h1>
        <p className="sub">
          Know agents who&rsquo;d love it? Every agent you bring in earns you {COMMISSION_PCT}% every month they pay, for
          up to {COMMISSION_MONTHS} months. That&rsquo;s about $19 a month for each paying agent.
        </p>
        <a className="btn" href="#apply">Apply to be a partner</a>
      </section>

      <section className="steps">
        <ol>
          <li><b>1</b><h3>Apply</h3><p>It takes two minutes. We look it over and get back to you within a couple of days.</p></li>
          <li><b>2</b><h3>Share your link</h3><p>You get your own link and a private page that shows your clicks, signups and earnings.</p></li>
          <li><b>3</b><h3>Get paid every month</h3><p>We pay you by PayPal or bank transfer once a month.</p></li>
        </ol>
      </section>

      <section className="who">
        <h2>Who it&rsquo;s for</h2>
        <div className="cards">
          <article>
            <p className="tag">Agent influencers</p>
            <h3>{COMMISSION_PCT}% for {COMMISSION_MONTHS} months</h3>
            <p>You post about real estate, and agents listen to you. Share what you use, and get paid for it.</p>
          </article>
          <article className="coach">
            <p className="tag">Real estate coaches</p>
            <h3>{COMMISSION_PCT}% for {COMMISSION_MONTHS} months, plus a gift for your people</h3>
            <p>
              Your students get {COACH_TRIAL_DAYS} days free instead of 14. You look good handing it out, and one room of
              agents can add up fast.
            </p>
          </article>
        </div>
        <div className="math">
          <p className="m-k">Here&rsquo;s the math</p>
          <p className="m-big">10 paying agents &asymp; $190 a month</p>
          <p className="m-sub">That&rsquo;s about $2,300 over their first year, as long as they stay.</p>
        </div>
      </section>

      <section className="apply" id="apply">
        <div className="apply-in">
          <h2>Apply to be a partner</h2>
          <p className="lead">Tell us a little about you and where you&rsquo;d share Marvberry.</p>
          <ApplyForm />
        </div>
      </section>

      <section className="terms" id="terms">
        <h2>Partner terms</h2>
        <ul>
          <li>
            You earn {COMMISSION_PCT}% of what Marvberry receives from each agent you refer, after payment processing fees,
            for their first {COMMISSION_MONTHS} payments. On the $67 plan, that&rsquo;s about $19.29 a month.
          </li>
          <li>You earn only while the agent stays active and paying. If they cancel, commission on them stops.</li>
          <li>A referral counts when someone signs up within {REF_DAYS} days of clicking your link.</li>
          <li>We pay once a month, by PayPal or bank transfer, once you&rsquo;re owed $25 or more.</li>
          <li>If a payment is refunded, the commission on it comes off.</li>
          <li>You can&rsquo;t refer yourself, and we don&rsquo;t pay on fake or duplicate accounts.</li>
          <li>When you share your link, say it&rsquo;s an affiliate link. The FTC requires it.</li>
          <li>Don&rsquo;t run paid ads on the Marvberry name, and don&rsquo;t send spam.</li>
          <li>Before we pay you more than $600 in a year, we&rsquo;ll ask for a W-9 for tax reporting.</li>
          <li>We can update these terms or end a partnership with notice. Earnings you&rsquo;ve already made are still paid.</li>
        </ul>
        <p className="q">Questions? Email team@marvberry.com.</p>
      </section>

      <footer className="foot">
        <a href="/"><img src="/marvberry-wordmark.png" alt="Marvberry" width={104} height={20} style={{ height: 20, width: "auto" }} /></a>
        <nav><a href="/">Home</a><a href="/privacy">Privacy</a></nav>
      </footer>
    </div>
  )
}

const CSS = `
.mbp{position:relative;isolation:isolate;min-height:100vh;background:#fff;color:#16151a;overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.mbp *{box-sizing:border-box}
.mbp h1,.mbp h2,.mbp h3,.mbp p,.mbp ul,.mbp ol{margin:0;padding:0}
.mbp a{color:inherit;text-decoration:none}
.mbp .glow{position:absolute;inset:0 0 auto;height:900px;z-index:-1;pointer-events:none;
  background:radial-gradient(40% 50% at 20% 10%,#ffe3ef,transparent 70%),radial-gradient(35% 45% at 85% 5%,#ffe8d8,transparent 70%),radial-gradient(40% 40% at 60% 60%,#efe9ff,transparent 70%)}
.mbp .nav{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(16px,5vw,64px)}
.mbp .btn{display:inline-flex;align-items:center;justify-content:center;background:#16151a;color:#fff;border-radius:999px;padding:15px 26px;font-weight:550;font-size:16px;border:0;cursor:pointer;box-shadow:0 8px 20px -8px rgba(22,21,26,.5)}
.mbp .btn.sm{padding:10px 18px;font-size:14px}
.mbp .hero{text-align:center;padding:clamp(48px,8vw,96px) 16px 0}
.mbp .chip{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid rgba(22,21,26,.09)}
.mbp .dot{width:7px;height:7px;border-radius:50%;background:#BC559E}
.mbp h1{font-size:clamp(40px,1rem + 5vw,80px);line-height:1.03;letter-spacing:-.045em;font-weight:650;max-width:14ch;margin:24px auto 0;text-wrap:balance}
.mbp .grad{background:linear-gradient(90deg,#BC559E,#E8857A 60%,#9C7CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.mbp .sub{font-size:clamp(18px,.9rem + .5vw,21px);line-height:1.55;color:#55535b;max-width:36rem;margin:22px auto 34px}
.mbp .steps{max-width:1080px;margin:clamp(64px,8vw,100px) auto 0;padding:0 16px}
.mbp .steps ol{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.mbp .steps li{background:rgba(255,255,255,.8);border:1px solid rgba(22,21,26,.08);border-radius:24px;padding:26px}
.mbp .steps b{display:inline-flex;width:34px;height:34px;border-radius:50%;align-items:center;justify-content:center;background:#BC559E;color:#fff;font-size:15px}
.mbp .steps h3{font-size:20px;margin-top:16px;letter-spacing:-.02em;font-weight:600}
.mbp .steps p{margin-top:6px;font-size:15.5px;line-height:1.55;color:#55535b}
.mbp h2{font-size:clamp(30px,1rem + 2.4vw,48px);letter-spacing:-.035em;line-height:1.08;font-weight:650;text-align:center}
.mbp .who{max-width:1080px;margin:0 auto;padding:clamp(72px,9vw,120px) 16px 0}
.mbp .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:40px}
.mbp .cards article{border-radius:28px;padding:30px;background:#f6f5f3}
.mbp .cards article.coach{background:linear-gradient(140deg,#fde9f2,#fff1e8 50%,#ede8ff)}
.mbp .tag{display:inline-block;font-size:13px;font-weight:600;padding:5px 11px;border-radius:999px;background:#fff}
.mbp .cards h3{font-size:24px;letter-spacing:-.025em;line-height:1.2;margin-top:16px;font-weight:620}
.mbp .cards p:not(.tag){font-size:16px;line-height:1.6;color:#55535b;margin-top:10px}
.mbp .math{margin-top:16px;border-radius:28px;background:#16151a;color:#fff;padding:32px;text-align:center}
.mbp .m-k{font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#f2a7d4}
.mbp .m-big{font-size:clamp(30px,1rem + 2.6vw,52px);font-weight:650;letter-spacing:-.04em;margin-top:10px}
.mbp .m-sub{margin-top:8px;font-size:16px;opacity:.72}
.mbp .apply{padding:clamp(72px,9vw,120px) 16px 0}
.mbp .apply-in{max-width:640px;margin:0 auto}
.mbp .lead{text-align:center;font-size:18px;color:#55535b;margin-top:12px}
.mbp .terms{max-width:720px;margin:0 auto;padding:clamp(64px,8vw,100px) 16px 0}
.mbp .terms h2{font-size:28px}
.mbp .terms ul{margin-top:22px;padding-left:20px;list-style:disc;display:flex;flex-direction:column;gap:10px}
.mbp .terms li{font-size:15.5px;line-height:1.6;color:#55535b}
.mbp .terms li::marker{color:#BC559E}
.mbp .q{margin-top:18px;font-size:15px;color:#55535b}
.mbp .foot{display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:clamp(64px,8vw,100px) auto 0;padding:32px 16px 44px;border-top:1px solid rgba(22,21,26,.09);font-size:14px;color:#8d8b92}
.mbp .foot nav{display:flex;gap:20px}
@media (max-width:760px){.mbp .steps ol,.mbp .cards{grid-template-columns:1fr}}
`
