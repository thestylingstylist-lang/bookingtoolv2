import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { buySetup } from "./actions"

// The done-for-you setup offer. Written from the Brand Foundation (Oct 30, 2026):
// presence vs. the ghost, Ruler voice (confident, calm), a little bit of wow.
export const metadata: Metadata = {
  title: { absolute: "Done-for-you setup — Marvberry" },
  description: "We set up your whole client experience in 7 days. You show up. It's ready.",
}

const PRICE = "$997"

const DAYS = [
  { d: "Day 1", t: "We talk", p: "One call. You tell us how you work, your hours, your brand. Then you're done with the hard part." },
  { d: "Days 2–3", t: "Your booking page", p: "Your name, your photo, your hours. One link that makes your first impression for you." },
  { d: "Days 3–4", t: "Your agreements", p: "We load your agreements with your terms filled in. Clients sign from their phone." },
  { d: "Days 5–6", t: "Your messages", p: "We write what your clients hear from you, in your voice. Welcome, reminders, what's next." },
  { d: "Day 7", t: "You go live", p: "We walk through it together with a real client. You show up. It's ready." },
]

// Two ways in: right after signup (?offer=1, signed in), it's a one-time offer with a skip.
// Anyone else sees the same page, and the button starts with signing up.
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ offer?: string }> }) {
  const sp = await searchParams
  let signedIn = false
  try {
    const { data: { user } } = await (await createClient()).auth.getUser()
    signedIn = !!user
  } catch {}
  const offer = signedIn && sp.offer === "1"

  const Cta = ({ small = false }: { small?: boolean }) =>
    signedIn ? (
      <form action={buySetup}>
        <button className={`btn${small ? " sm" : ""}`}>{small ? "Set it up for me" : `Yes, set it all up for me \u00b7 ${PRICE}`}</button>
      </form>
    ) : (
      <a className={`btn${small ? " sm" : ""}`} href="/signup">{small ? "Get started" : "Get started"}</a>
    )
  const Skip = () =>
    offer ? (
      <p className="skip">
        <a href="/chat?welcome=1">No thanks, I&rsquo;ll set it up myself</a>
        <span>You still get a free setup call.</span>
      </p>
    ) : null

  return (
    <div className="mbs">
      <style>{CSS}</style>
      <div aria-hidden className="glow" />

      <header className="nav">
        <a href="/"><img src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} style={{ height: 24, width: "auto" }} /></a>
        {offer ? (
          <ol className="track" aria-label="Your progress">
            <li className="done">Account created</li>
            <li className="now">Your setup</li>
            <li>Book your call</li>
          </ol>
        ) : (
          <Cta small />
        )}
      </header>

      <section className="hero">
        <p className="chip"><span className="dot" />{offer ? "One more thing before you start" : "Done-for-you setup"}</p>
        <h1>Never ghost a client again. <span className="grad">Starting next week.</span></h1>
        <p className="sub">
          {offer ? "Want us to set it all up for you? " : ""}We set up your whole client experience in 7 days. Booking,
          agreements, and every message your clients get, written in your voice. You show up. It&rsquo;s ready.
        </p>
        <Cta />
        <p className="fine">{PRICE} one time. Ready in 7 days.</p>
        <Skip />
      </section>

      <section className="juggle">
        <p className="kicker">The juggle</p>
        <h2>You only have two hands.</h2>
        <div className="juggle-body">
          <p>
            You&rsquo;ve got clients waiting on answers, paperwork to chase, and new clients still coming in. So with ten
            clients, you&rsquo;re really only helping two at a time.
          </p>
          <p>That&rsquo;s when things get dropped. That&rsquo;s when you type &ldquo;sorry for the late reply.&rdquo;</p>
          <p className="true">You&rsquo;re ghosting your clients, and you don&rsquo;t mean to.</p>
        </div>
      </section>

      <section className="ba">
        <div className="col before">
          <p className="tag">Before</p>
          <ul>
            <li>Text threads and missed calls</li>
            <li>A blurry PDF to print, sign and scan</li>
            <li>&ldquo;Hey, any update?&rdquo; at 9pm</li>
            <li>&ldquo;Sorry for the late reply.&rdquo;</li>
          </ul>
        </div>
        <div className="col after">
          <p className="tag">After</p>
          <ul>
            <li>One link. Clients book themselves.</li>
            <li>They sign from their phone in a minute.</li>
            <li>Every client sees what&rsquo;s next, without asking.</li>
            <li>Your client just signed. You were at dinner.</li>
          </ul>
        </div>
      </section>

      <section className="week">
        <p className="kicker">Your 7 days</p>
        <h2>You show up once. We do the rest.</h2>
        <ol>
          {DAYS.map((x) => (
            <li key={x.d}>
              <span className="d">{x.d}</span>
              <div>
                <h3>{x.t}</h3>
                <p>{x.p}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="price">
        <div className="card">
          <p className="kicker">Done-for-you setup</p>
          <p className="big">{PRICE}<span> one time</span></p>
          <p className="then">Then Marvberry is $67 a month. Cancel anytime.</p>
          <ul>
            <li>Your booking page, branded to you</li>
            <li>Your agreements, loaded and ready to sign</li>
            <li>Your client messages, written in your voice</li>
            <li>Your client steps, from first call to closing</li>
            <li>A live walkthrough with your first real client</li>
          </ul>
          <Cta />
          <Skip />
          <p className="note">
            Rather do it yourself? Every Marvberry plan comes with a free setup call. This is for agents who want it all
            done for them.
          </p>
        </div>
      </section>

      <section className="manifesto">
        <p>We believe the best agents aren&rsquo;t the loudest ones.</p>
        <p className="strong">They&rsquo;re the ones who show up.</p>
        <Cta />
        <p className="fine">Never ghost a client again.</p>
        <Skip />
      </section>

      <footer className="foot">
        <img src="/marvberry-wordmark.png" alt="Marvberry" width={104} height={20} style={{ height: 20, width: "auto" }} />
        <nav><a href="/">Home</a><a href="/privacy">Privacy</a></nav>
      </footer>
    </div>
  )
}

const CSS = `
.mbs{position:relative;isolation:isolate;min-height:100vh;background:#fff;color:#16151a;overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.mbs *{box-sizing:border-box}
.mbs h1,.mbs h2,.mbs h3,.mbs p,.mbs ul,.mbs ol{margin:0;padding:0}
.mbs a{color:inherit;text-decoration:none}
.mbs h1,.mbs h2{text-wrap:balance}
.mbs .glow{position:absolute;inset:0 0 auto;height:820px;z-index:-1;pointer-events:none;
  background:radial-gradient(40% 50% at 18% 8%,#ffe3ef,transparent 70%),radial-gradient(35% 45% at 85% 4%,#ffe8d8,transparent 70%),radial-gradient(40% 40% at 60% 60%,#efe9ff,transparent 70%)}
.mbs .nav{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(16px,5vw,64px)}
.mbs .btn{display:inline-flex;align-items:center;justify-content:center;background:#16151a;color:#fff;border-radius:999px;padding:15px 28px;font-weight:550;font-size:16px;box-shadow:0 8px 20px -8px rgba(22,21,26,.5)}
.mbs .btn{border:0;cursor:pointer;font-family:inherit}
.mbs .btn.sm{padding:10px 18px;font-size:14px}
.mbs .skip{margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:14.5px}
.mbs .skip a{color:#16151a;border-bottom:1px solid #BC559E}
.mbs .skip span{font-size:13px;color:#8d8b92}
.mbs .track{list-style:none;margin:0;padding:0;display:flex;gap:18px;font-size:13.5px;font-weight:500;color:#8d8b92}
.mbs .track li{display:flex;align-items:center;gap:8px}
.mbs .track li::before{content:"";width:18px;height:18px;border-radius:50%;border:1.5px solid #d6d4d0;display:grid;place-items:center;font-size:10px}
.mbs .track li.done::before{content:"\\2713";background:#BC559E;border-color:#BC559E;color:#fff}
.mbs .track li.now{color:#16151a}
.mbs .track li.now::before{border-color:#BC559E;box-shadow:inset 0 0 0 4px #fff;background:#BC559E}
@media (max-width:640px){.mbs .track li:not(.now){display:none}}
.mbs .fine{margin-top:14px;font-size:14px;color:#8d8b92}
.mbs .kicker{font-size:13px;font-weight:600;color:#BC559E;text-transform:uppercase;letter-spacing:.14em}
.mbs h2{font-size:clamp(32px,1rem + 3vw,56px);letter-spacing:-.035em;line-height:1.05;font-weight:650;margin-top:12px}

.mbs .hero{text-align:center;padding:clamp(56px,9vw,110px) 16px 0}
.mbs .chip{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid rgba(22,21,26,.09)}
.mbs .dot{width:7px;height:7px;border-radius:50%;background:#BC559E}
.mbs h1{font-size:clamp(42px,1rem + 5.4vw,86px);line-height:1.02;letter-spacing:-.045em;font-weight:650;max-width:14ch;margin:24px auto 0}
.mbs .grad{background:linear-gradient(90deg,#BC559E,#E8857A 60%,#9C7CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.mbs .sub{font-size:clamp(18px,.9rem + .5vw,21px);line-height:1.55;color:#55535b;max-width:36rem;margin:22px auto 34px}

.mbs .juggle{max-width:760px;margin:0 auto;padding:clamp(96px,12vw,150px) 16px 0;text-align:center}
.mbs .juggle-body{margin-top:24px;display:flex;flex-direction:column;gap:14px;font-size:19px;line-height:1.6;color:#55535b}
.mbs .juggle .true{margin-top:8px;font-size:clamp(22px,1rem + 1vw,28px);font-weight:600;letter-spacing:-.02em;color:#16151a}

.mbs .ba{max-width:1000px;margin:clamp(72px,9vw,110px) auto 0;padding:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.mbs .col{border-radius:28px;padding:30px}
.mbs .before{background:#f6f5f3}
.mbs .after{background:linear-gradient(140deg,#fde9f2,#fff1e8 55%,#ede8ff)}
.mbs .tag{display:inline-block;font-size:13px;font-weight:600;padding:5px 12px;border-radius:999px;background:#fff}
.mbs .ba ul{list-style:none;margin-top:20px;display:flex;flex-direction:column;gap:12px;font-size:17px;line-height:1.45}
.mbs .before li{color:#8d8b92;text-decoration:line-through;text-decoration-color:rgba(22,21,26,.25)}
.mbs .after li{font-weight:500}
.mbs .after li:last-child{font-weight:650;color:#93407A}

.mbs .week{max-width:860px;margin:0 auto;padding:clamp(96px,12vw,140px) 16px 0;text-align:center}
.mbs .week ol{list-style:none;margin-top:40px;text-align:left;display:flex;flex-direction:column}
.mbs .week li{display:grid;grid-template-columns:120px 1fr;gap:20px;padding:22px 0;border-top:1px solid rgba(22,21,26,.09)}
.mbs .week li:last-child{border-bottom:1px solid rgba(22,21,26,.09)}
.mbs .week .d{font-size:14px;font-weight:600;color:#BC559E;padding-top:3px}
.mbs .week h3{font-size:21px;letter-spacing:-.02em;font-weight:620}
.mbs .week li p{margin-top:4px;font-size:16px;line-height:1.55;color:#55535b}

.mbs .price{padding:clamp(96px,12vw,140px) 16px 0}
.mbs .card{max-width:560px;margin:0 auto;padding:clamp(28px,5vw,44px);border-radius:32px;text-align:center;
  background:radial-gradient(80% 60% at 15% 0%,#ffe3ef,transparent 70%),radial-gradient(70% 60% at 100% 100%,#ece6ff,transparent 70%),#fff;
  border:1px solid rgba(22,21,26,.08);box-shadow:0 40px 80px -50px rgba(22,21,26,.35)}
.mbs .big{margin-top:12px;font-size:clamp(56px,1rem + 5vw,80px);font-weight:650;letter-spacing:-.05em;line-height:1}
.mbs .big span{font-size:18px;font-weight:500;letter-spacing:0;color:#55535b;margin-left:6px}
.mbs .then{margin-top:10px;font-size:16px;color:#55535b}
.mbs .card ul{list-style:none;margin:26px auto 30px;display:flex;flex-direction:column;gap:11px;text-align:left;max-width:380px;font-size:16px}
.mbs .card li{padding-left:28px;position:relative}
.mbs .card li::before{content:"";position:absolute;left:0;top:3px;width:18px;height:18px;border-radius:50%;background:#FCE4F1}
.mbs .card li::after{content:"";position:absolute;left:6px;top:7px;width:6px;height:9px;border:solid #BC559E;border-width:0 2px 2px 0;transform:rotate(45deg)}
.mbs .note{margin-top:22px;font-size:14px;line-height:1.55;color:#8d8b92}

.mbs .manifesto{text-align:center;padding:clamp(110px,14vw,170px) 16px clamp(80px,10vw,120px);background:radial-gradient(50% 60% at 50% 45%,#fdeef5,#fff 70%)}
.mbs .manifesto p:first-child{font-size:clamp(22px,1rem + 1.2vw,32px);color:#55535b;letter-spacing:-.02em}
.mbs .manifesto .strong{margin:6px 0 34px;font-size:clamp(34px,1rem + 3.4vw,60px);font-weight:650;letter-spacing:-.04em}

.mbs .foot{display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:0 auto;padding:32px 16px 44px;border-top:1px solid rgba(22,21,26,.09);font-size:14px;color:#8d8b92}
.mbs .foot nav{display:flex;gap:20px}
@media (max-width:720px){.mbs .ba{grid-template-columns:1fr}.mbs .week li{grid-template-columns:1fr;gap:6px}}
`
