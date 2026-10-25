"use client"
// Marvberry home page: modern, bright and easy. One clean font, the berry, real screens.
// The six features lock in place while you scroll, so a lot of information reads like one page.
import { useEffect, useRef, useState } from "react"

const START = "/signup"
const CALL = "/chat"

type Feature = { k: string; c: string; i: string; t: string; d: string; img: string; shape: "full" | "wide" | "tall" }
const FEATURES: Feature[] = [
  { k: "Booking", c: "c1", i: "cal", t: "Clients book themselves.", d: "One link with your photo and your hours. They pick a time. You just show up.", img: "/brand/booking-desktop.webp", shape: "full" },
  { k: "Agreements", c: "c2", i: "doc", t: "Signed from their phone.", d: "Your agreement, already filled in with your terms. They sign in about a minute.", img: "/brand/signs-full.jpg", shape: "tall" },
  { k: "Client page", c: "c3", i: "people", t: "They always know what’s next.", d: "Every client gets their own page. No password, no app. They check it instead of texting you.", img: "/brand/portal-full.jpg", shape: "tall" },
  { k: "Deal tracker", c: "c4", i: "list", t: "Every step. Every due date.", d: "See what’s done and what’s next for every client, so nothing slips.", img: "/brand/feature-tracker.jpg", shape: "tall" },
  { k: "Reminders", c: "c5", i: "bell", t: "Follow-ups, already written.", d: "Marvberry drafts the reminder in your voice. You look it over and send it.", img: "/brand/assistant-draft.jpg", shape: "wide" },
  { k: "Offers", c: "c6", i: "home", t: "Homes and offers in one place.", d: "Paste a listing link, set the showing and send the offer, all from inside Marvberry.", img: "/brand/feature-offers.jpg", shape: "full" },
]

const ASSIST = [
  { c: "c5", i: "bell", t: "Reminders in your voice", d: "It writes the nudge before something is due. You send it, or let it send for you." },
  { c: "c3", i: "chat", t: "Reply drafts", d: "A client writes in. Your reply is drafted and waiting, ready for you to read and send." },
  { c: "c1", i: "sun", t: "Morning update", d: "A short note each morning on what matters today, so you start the day knowing." },
  { c: "c2", i: "pen", t: "Signed by you", d: "Your email signature goes under every email, with your photo, phone and email." },
]

const INCLUDED = [
  "Your booking page, with reminders",
  "Agreements signed from any phone",
  "A page for every client, no login",
  "Deal tracker with steps and due dates",
  "Document requests",
  "AI reminders and reply drafts",
  "Offers built and sent to the listing agent",
  "Your own email signature",
]

function Icon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    cal: (<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>),
    doc: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>),
    people: (<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.6.8 2.6 2.6 3 5.2" /></>),
    list: (<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.6" /></>),
    bell: (<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>),
    home: (<><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5M10 20v-5h4v5" /></>),
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
    pen: (<><path d="M4 20c3-1 5-4 7-4s1 3 3 3 3-2 6-2" /><path d="M14.5 4.5l5 5L11 18l-5 .5.5-5z" /></>),
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {p[name]}
    </svg>
  )
}

export default function Home() {
  const lockRef = useRef<HTMLElement>(null)
  const meetRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [cur, setCur] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
      // Meet Marvberry fades as it scrolls up and away.
      const m = meetRef.current
      if (m && !reduce) {
        const r = m.getBoundingClientRect()
        const o = r.top < 0 ? Math.max(0, 1 + r.top / (r.height * 0.85)) : 1
        m.style.opacity = String(o)
        m.style.transform = `translateY(${(1 - o) * -24}px)`
      }
      // The six features: which one is showing, and how far through it we are.
      const l = lockRef.current
      if (l) {
        const total = l.offsetHeight - window.innerHeight
        const p = Math.min(Math.max(-l.getBoundingClientRect().top / total, 0), 0.9999)
        const n = Math.floor(p * FEATURES.length)
        setCur(n)
        if (barRef.current) barRef.current.style.width = `${((p * FEATURES.length - n) * 100).toFixed(1)}%`
      }
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const go = (n: number) => {
    const l = lockRef.current
    if (!l) return
    const total = l.offsetHeight - window.innerHeight
    const top = l.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + (total * (n + 0.05)) / FEATURES.length, behavior: "smooth" })
  }

  return (
    <div className="hv">
      <style>{CSS}</style>

      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <a href="#top">
          <img className="logo" src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} />
        </a>
        <nav>
          <a href="#features" className="hide-sm">Features</a>
          <a href="#pricing" className="hide-sm">Pricing</a>
          <a href="/login" className="hide-sm">Log in</a>
          <a className="btn sm" href={START}>Try Marvberry</a>
        </nav>
      </header>

      <div className="hero-wrap" id="top">
        <section className="hero">
          <p className="chip"><span className="dot" />For solo real estate agents</p>
          <h1>
            Finally, everything around the deal <span className="grad">in one place.</span>
          </h1>
          <p className="sub">
            Booking, signatures, documents and client updates, for real estate agents who run their deals on relationships.
          </p>
          <div className="ctas">
            <a className="btn" href={START}>Try Marvberry free</a>
            <a className="btn ghost" href="#meet">See how it works</a>
          </div>
          <p className="fine">14 days free. No credit card.</p>

          <div className="stage">
            <div className="glow" />
            <div className="frame"><img src="/brand/booking-desktop.webp" alt="A real estate agent's booking page" /></div>
            <div className="hphone"><img src="/brand/portal-full.jpg" alt="A client's page showing their next step" /></div>
            <img className="hberry" src="/brand/berry.webp" alt="" />
          </div>

          <div className="icons" aria-label="What Marvberry does">
            {FEATURES.map((f, n) => (
              <a key={f.k} href="#features" onClick={(e) => { e.preventDefault(); go(n) }}>
                <span className={`ic ${f.c}`}><Icon name={f.i} /></span>
                {f.k}
              </a>
            ))}
          </div>
        </section>
      </div>

      <section className="meet" id="meet">
        <div className="meet-in" ref={meetRef}>
          <div>
            <p className="kicker">Meet Marvberry</p>
            <h2>Meet <span className="grad">Marvberry.</span></h2>
            <p className="tag">Your AI-powered partner for everything around the deal.</p>
            <p className="body">
              Marvberry books your meetings, gets your agreements signed and keeps your clients posted. It even writes your
              follow-ups. So you get back to what you do best: building relationships and closing deals.
            </p>
            <a className="btn" href="#features">See how it works <span aria-hidden>&rarr;</span></a>
          </div>
          <div className="orbit">
            <div className="ring" />
            <img className="berry" src="/brand/berry.webp" alt="The Marvberry berry" />
            <span className="pill p1"><span className="ic c1"><Icon name="cal" /></span>Books appointments</span>
            <span className="pill p2"><span className="ic c2"><Icon name="doc" /></span>Prepares agreements</span>
            <span className="pill p3"><span className="ic c3"><Icon name="people" /></span>Keeps clients informed</span>
            <span className="pill p4"><span className="ic c5"><Icon name="bell" /></span>Writes your follow-ups</span>
            <span className="pill p5"><span className="ic c4"><Icon name="list" /></span>Tracks every step</span>
          </div>
        </div>
      </section>

      <div className="feats-head" id="features">
        <p className="kicker">AI deal manager</p>
        <h2>Built for agents whose business runs on relationships.</h2>
        <p>
          Your relationships bring the deals, but the work around them pulls you away from your clients. Marvberry handles
          it, from the first booking to the closing table.
        </p>
      </div>

      <section className="lock" ref={lockRef}>
        <div className="pin">
          <div className="pin-in">
            <ul className="list">
              {FEATURES.map((f, n) => (
                <li key={f.k} className={n === cur ? "on" : ""} onClick={() => go(n)}>
                  <div className="row">
                    <span className={`ic ${f.c}`}><Icon name={f.i} /></span>
                    <h3>{f.k}</h3>
                  </div>
                  <div className="more">
                    <div>
                      <p className="big">{f.t}</p>
                      <p>{f.d}</p>
                      <div className="bar">{n === cur && <span ref={barRef} />}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="screen">
              <div className="bg" />
              {FEATURES.map((f, n) => (
                <div key={f.k} className={`slide${n === cur ? " on" : ""}`}>
                  <div className={f.shape}>
                    <img src={f.img} alt={f.k} loading={n === 0 ? "eager" : "lazy"} />
                  </div>
                </div>
              ))}
            </div>
            <div className="dots" aria-hidden>
              {FEATURES.map((f, n) => <i key={f.k} className={n === cur ? "on" : ""} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="sched">
        <div className="sched-in">
          <div className="sched-copy">
            <p className="kicker">Scheduling</p>
            <h2>Your calendar. Your rules.</h2>
            <p className="lead">
              Clients book from one link with your photo and your name on it. You decide when you&rsquo;re open, and
              Marvberry handles the rest.
            </p>
            <ul className="ticks">
              <li><span className="ic c1"><Icon name="check" /></span>Your days, your hours, your days off</li>
              <li><span className="ic c1"><Icon name="check" /></span>Video or phone, your client picks</li>
              <li><span className="ic c1"><Icon name="check" /></span>Notice time, so nobody books you in an hour</li>
              <li><span className="ic c1"><Icon name="check" /></span>Confirmations and reminders, sent for you</li>
              <li><span className="ic c1"><Icon name="check" /></span>Clients reschedule or cancel on their own</li>
            </ul>
          </div>
          <div className="sched-pic">
            <div className="glow" />
            <div className="frame"><img src="/brand/booking-desktop.webp" alt="A real estate agent's booking page" loading="lazy" /></div>
          </div>
        </div>
      </section>

      <section className="assist">
        <div className="assist-in">
          <p className="kicker">Your AI assistant</p>
          <h2>It writes like you. It&rsquo;s signed by you.</h2>
          <p className="lead c">
            Marvberry learns from a few messages you&rsquo;ve written. Then it drafts your reminders and replies in your
            voice. Nothing goes out unless you say so.
          </p>
          <div className="cards">
            {ASSIST.map((a) => (
              <article key={a.t}>
                <span className={`ic ${a.c}`}><Icon name={a.i} /></span>
                <h3>{a.t}</h3>
                <p>{a.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <p className="kicker">Pricing</p>
        <h2>One plan. Everything included.</h2>
        <div className="price-card">
          <div className="price-top">
            <p className="price">$67<span>/month</span></p>
            <p className="daily">That&rsquo;s about $2.20 a day.</p>
            <a className="btn" href={START}>Try Marvberry free</a>
            <p className="fine">14 days free. No credit card.<br />30-day money-back guarantee.</p>
          </div>
          <ul>
            {INCLUDED.map((x) => (
              <li key={x}><span className="ic c3"><Icon name="check" /></span>{x}</li>
            ))}
          </ul>
        </div>
        <p className="broker">Running a brokerage? <a href={CALL}>Book a consultation</a>.</p>
      </section>

      <div className="steps-wrap" id="setup">
        <section className="steps">
          <p className="kicker">No tech skills needed</p>
          <h2>No tech skills. We set it up with you.</h2>
          <ol>
            <li><b>1</b><h3>Book a free call</h3><p>Pick a time that works for you.</p></li>
            <li><b>2</b><h3>We build it with you</h3><p>Your booking page, your agreements and your client steps.</p></li>
            <li><b>3</b><h3>You just use it</h3><p>It&rsquo;s running from day one.</p></li>
          </ol>
          <a className="btn light" href={START}>Get started</a>
        </section>
      </div>

      <section className="final">
        <img className="fberry" src="/brand/berry.webp" alt="" />
        <h2>Your next deal doesn&rsquo;t have to stall.</h2>
        <a className="btn" href={START}>Get started free</a>
        <p className="fine">14 days free. No credit card.</p>
      </section>

      <footer className="foot">
        <p className="fmark">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={104} height={20} />
          <span>The Real Estate Agent&rsquo;s Client Experience Assistant</span>
        </p>
        <nav>
          <a href="/login">Log in</a>
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  )
}

const CSS = `
.hv{
  --ink:#16151a; --soft:#55535b; --muted:#8d8b92; --line:rgba(22,21,26,.09); --berry:#BC559E; --tile:#f6f5f3;
  color-scheme:light; background:#fff; color:var(--ink); min-height:100vh; overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;
}
.hv *{box-sizing:border-box}
.hv h1,.hv h2,.hv h3,.hv p,.hv ul,.hv ol{margin:0;padding:0}
.hv img{display:block;max-width:100%;height:auto}
.hv a{color:inherit;text-decoration:none}
.hv :focus-visible{outline:2px solid var(--berry);outline-offset:3px;border-radius:6px}
.hv h1,.hv h2{text-wrap:balance}

.hv .nav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:16px clamp(16px,5vw,64px);transition:background .3s,box-shadow .3s}
.hv .nav.scrolled{background:rgba(255,255,255,.78);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 1px 0 var(--line)}
.hv .nav .logo{height:24px;width:auto}
.hv .nav nav{display:flex;gap:28px;align-items:center;font-size:15px;color:var(--soft)}
.hv .nav nav a:hover{color:var(--ink)}
.hv .btn{display:inline-flex;align-items:center;gap:8px;justify-content:center;background:var(--ink);color:#fff;border-radius:999px;padding:15px 26px;font-weight:550;font-size:16px;box-shadow:0 8px 20px -8px rgba(22,21,26,.5);transition:transform .2s}
.hv .nav nav a.btn{color:#fff}
.hv .btn:hover{transform:translateY(-1px)}
.hv .btn.sm{padding:10px 18px;font-size:14px}
.hv .btn.ghost{background:#fff;color:var(--ink);box-shadow:none;border:1px solid var(--line)}
.hv .btn.light{background:#fff;color:var(--ink)}

.hv .hero-wrap{background:radial-gradient(60% 50% at 50% 0%,#fff1f6 0%,#fff 70%);margin-top:-72px;padding-top:72px}
.hv .hero{text-align:center;padding:clamp(48px,8vw,88px) 16px 0}
.hv .chip{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid var(--line)}
.hv .dot{width:7px;height:7px;border-radius:50%;background:var(--berry)}
.hv h1{font-size:clamp(42px,1rem + 5.6vw,88px);line-height:1.02;letter-spacing:-.045em;font-weight:650;max-width:15ch;margin:24px auto 0}
.hv .grad{background:linear-gradient(90deg,#BC559E,#E8857A 60%,#9C7CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.hv .sub{font-size:clamp(18px,.9rem + .5vw,21px);line-height:1.55;color:var(--soft);max-width:38rem;margin:22px auto 0}
.hv .ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:34px}
.hv .fine{margin-top:14px;font-size:14px;line-height:1.5;color:var(--muted)}
.hv .stage{position:relative;max-width:1080px;margin:64px auto 0;padding-bottom:40px}
.hv .glow{position:absolute;inset:6% -4% -2%;background:radial-gradient(40% 50% at 30% 50%,#ffd2e4,transparent 70%),radial-gradient(40% 50% at 70% 40%,#ffe0c7,transparent 70%),radial-gradient(35% 45% at 55% 70%,#ddd6ff,transparent 70%);filter:blur(60px);z-index:0}
.hv .frame{position:relative;z-index:1;border-radius:22px;overflow:hidden;background:#fff;border:1px solid var(--line);box-shadow:0 40px 80px -40px rgba(22,21,26,.35)}
.hv .stage .frame{width:86%}
.hv .hphone{position:absolute;z-index:2;right:3%;bottom:0;width:22%;border-radius:28px;padding:6px;background:#fff;box-shadow:0 30px 60px -20px rgba(22,21,26,.4)}
.hv .hphone img{border-radius:22px;aspect-ratio:9/16;object-fit:cover;object-position:top;width:100%}
.hv .hberry{position:absolute;z-index:3;width:min(230px,24%);right:17%;top:-110px;-webkit-mask-image:radial-gradient(circle,#000 38%,transparent 62%);mask-image:radial-gradient(circle,#000 38%,transparent 62%);animation:hvfl 5s ease-in-out infinite}
@keyframes hvfl{50%{transform:translateY(-10px)}}

.hv .icons{position:relative;z-index:4;display:flex;justify-content:center;gap:4px;flex-wrap:wrap;max-width:720px;margin:8px auto 0;padding:14px;background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:0 20px 50px -30px rgba(22,21,26,.3)}
.hv .icons a{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 14px;border-radius:16px;font-size:14px;font-weight:500;color:var(--soft);transition:background .2s,color .2s}
.hv .icons a:hover{background:var(--tile);color:var(--ink)}
.hv .ic{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex:none}
.hv .ic svg{width:22px;height:22px;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.hv .c1{background:#EEE9FF}.hv .c1 svg{stroke:#6E56CF}
.hv .c2{background:#FFEBE3}.hv .c2 svg{stroke:#C4552B}
.hv .c3{background:#FCE4F1}.hv .c3 svg{stroke:#BC559E}
.hv .c4{background:#E3EEFF}.hv .c4 svg{stroke:#3B6FD4}
.hv .c5{background:#FFF3D1}.hv .c5 svg{stroke:#B7871A}
.hv .c6{background:#F3E6FA}.hv .c6 svg{stroke:#8A4BB0}

.hv .kicker{font-size:13px;font-weight:600;color:var(--berry);text-transform:uppercase;letter-spacing:.14em}
.hv h2{font-size:clamp(32px,1rem + 3vw,56px);letter-spacing:-.035em;line-height:1.05;font-weight:650}
.hv .lead{font-size:18px;line-height:1.65;color:var(--soft);margin-top:18px;max-width:34rem}
.hv .lead.c{margin-left:auto;margin-right:auto;text-align:center}

.hv .meet{margin-top:clamp(80px,10vw,130px);padding:clamp(72px,9vw,120px) clamp(16px,5vw,64px);background:linear-gradient(120deg,#fff6f2 0%,#fdeef5 45%,#f3eefe 100%);overflow:hidden}
.hv .meet-in{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:1fr 1.05fr;gap:40px;align-items:center;will-change:opacity,transform}
.hv .meet h2{font-size:clamp(44px,1rem + 4.5vw,80px);line-height:1;letter-spacing:-.045em;margin-top:14px}
.hv .meet .tag{font-size:clamp(22px,1rem + .9vw,30px);line-height:1.25;letter-spacing:-.02em;font-weight:550;margin-top:18px}
.hv .meet .body{font-size:18px;line-height:1.65;color:var(--soft);margin:22px 0 32px;max-width:32rem}
.hv .orbit{position:relative;aspect-ratio:1/1;max-width:540px;width:100%;margin:0 auto}
.hv .orbit .berry{position:absolute;inset:12%;width:76%;-webkit-mask-image:radial-gradient(circle,#000 40%,transparent 66%);mask-image:radial-gradient(circle,#000 40%,transparent 66%);animation:hvfl 6s ease-in-out infinite}
.hv .ring{position:absolute;inset:10%;border:1px solid rgba(188,85,158,.18);border-radius:50%}
.hv .pill{position:absolute;display:flex;align-items:center;gap:10px;padding:10px 16px 10px 10px;background:rgba(255,255,255,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.9);border-radius:999px;box-shadow:0 16px 40px -20px rgba(22,21,26,.35);font-size:14.5px;font-weight:550;white-space:nowrap;animation:hvbob 6s ease-in-out infinite}
@keyframes hvbob{50%{transform:translateY(-6px)}}
.hv .pill .ic{width:34px;height:34px}.hv .pill .ic svg{width:17px;height:17px}
.hv .p1{top:4%;left:2%}.hv .p2{top:10%;right:0;animation-delay:-1.2s}.hv .p3{top:46%;right:-4%;animation-delay:-2.4s}.hv .p4{bottom:12%;right:6%;animation-delay:-3.6s}.hv .p5{bottom:22%;left:-2%;animation-delay:-4.8s}

.hv .feats-head{text-align:center;max-width:820px;margin:0 auto;padding:clamp(80px,10vw,130px) 16px 0}
.hv .feats-head h2{margin-top:12px}
.hv .feats-head p:last-child{font-size:19px;line-height:1.6;color:var(--soft);margin:16px auto 0;max-width:38rem}
.hv .lock{position:relative;height:calc(100vh * 6)}
.hv .pin{position:sticky;top:0;height:100vh;display:flex;align-items:center}
.hv .pin-in{width:100%;max-width:1000px;margin:0 auto;padding:72px clamp(16px,4vw,32px) 24px;display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(24px,4vw,48px);align-items:center}
.hv .list{list-style:none;display:flex;flex-direction:column;gap:2px}
.hv .list li{border-radius:18px;padding:12px 16px;cursor:pointer;transition:background .35s}
.hv .list .row{display:flex;align-items:center;gap:14px}
.hv .list .ic{width:38px;height:38px;opacity:.55;transition:opacity .35s}
.hv .list .ic svg{width:18px;height:18px}
.hv .list h3{font-size:18px;font-weight:600;letter-spacing:-.015em;color:var(--muted);transition:color .35s}
.hv .list .more{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s ease}
.hv .list .more>div{overflow:hidden}
.hv .list .big{font-size:clamp(21px,1rem + .6vw,26px);font-weight:620;letter-spacing:-.025em;line-height:1.2;margin:12px 0 6px 52px}
.hv .list .more p:not(.big){font-size:16px;line-height:1.55;color:var(--soft);margin-left:52px}
.hv .list li.on{background:var(--tile)}
.hv .list li.on h3{color:var(--ink)}
.hv .list li.on .ic{opacity:1}
.hv .list li.on .more{grid-template-rows:1fr}
.hv .bar{height:3px;border-radius:3px;background:rgba(22,21,26,.08);margin:14px 0 4px 52px;overflow:hidden}
.hv .bar span{display:block;height:100%;width:0;background:var(--berry);border-radius:3px}
.hv .screen{position:relative;height:min(52vh,440px)}
.hv .screen .bg{position:absolute;inset:0;border-radius:28px;background:linear-gradient(140deg,#fde9f2,#fff1e8 50%,#ede8ff)}
.hv .slide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:6%;opacity:0;transform:translateY(20px) scale(.98);transition:opacity .5s ease,transform .6s ease;pointer-events:none}
.hv .slide.on{opacity:1;transform:none}
.hv .slide:has(.full){padding:4%}
.hv .slide .full,.hv .slide .wide{width:100%;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 30px 70px -30px rgba(22,21,26,.4);border:1px solid var(--line)}
.hv .slide .full img{width:100%;height:auto}
.hv .slide .wide{aspect-ratio:16/10}
.hv .slide .wide img{width:100%;height:100%;object-fit:cover;object-position:left top}
.hv .slide .tall{height:100%;border-radius:24px;padding:5px;background:#fff;box-shadow:0 30px 70px -30px rgba(22,21,26,.45)}
.hv .slide .tall img{height:100%;width:auto;border-radius:19px;object-fit:cover;object-position:top}
.hv .dots{display:none}

.hv .sched{padding:clamp(80px,10vw,130px) clamp(16px,5vw,64px) 0}
.hv .sched-in{max-width:1160px;margin:0 auto;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,5vw,72px);align-items:center}
.hv .sched h2{margin-top:12px}
.hv .ticks{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:12px}
.hv .ticks li{display:flex;align-items:center;gap:12px;font-size:16.5px}
.hv .ticks .ic{width:28px;height:28px}.hv .ticks .ic svg{width:15px;height:15px;stroke-width:2.2}
.hv .sched-pic{position:relative}
.hv .sched-pic .glow{inset:-6% -6% -6% -6%}

.hv .assist{margin-top:clamp(80px,10vw,130px);padding:clamp(72px,9vw,110px) clamp(16px,5vw,64px);background:linear-gradient(160deg,#f6f2ff 0%,#fdf0f6 60%,#fff6ef 100%)}
.hv .assist-in{max-width:1080px;margin:0 auto;text-align:center}
.hv .assist h2{margin-top:12px}
.hv .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:48px;text-align:left}
.hv .cards article{background:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.95);border-radius:24px;padding:26px 24px;box-shadow:0 20px 50px -34px rgba(22,21,26,.35)}
.hv .cards h3{font-size:19px;letter-spacing:-.02em;font-weight:600;margin-top:18px}
.hv .cards p{font-size:15.5px;line-height:1.55;color:var(--soft);margin-top:8px}

.hv .pricing{text-align:center;max-width:960px;margin:0 auto;padding:clamp(80px,10vw,130px) 16px 0}
.hv .pricing h2{margin-top:12px}
.hv .price-card{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);margin-top:44px;text-align:left;border:1px solid var(--line);border-radius:32px;overflow:hidden;box-shadow:0 40px 80px -50px rgba(22,21,26,.35)}
.hv .price-top{padding:clamp(28px,4vw,44px);background:radial-gradient(80% 70% at 20% 10%,#ffe3ef,transparent 70%),radial-gradient(70% 60% at 90% 90%,#ece6ff,transparent 70%),#fff;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
.hv .price{font-size:clamp(56px,1rem + 5vw,80px);font-weight:650;letter-spacing:-.05em;line-height:1}
.hv .price span{font-size:18px;font-weight:500;letter-spacing:0;color:var(--soft);margin-left:4px}
.hv .daily{font-size:17px;color:var(--soft);margin:10px 0 26px}
.hv .price-card ul{list-style:none;padding:clamp(28px,4vw,44px);display:flex;flex-direction:column;gap:13px;background:#fff}
.hv .price-card li{display:flex;align-items:center;gap:12px;font-size:16px}
.hv .price-card li .ic{width:26px;height:26px}.hv .price-card li .ic svg{width:14px;height:14px;stroke-width:2.4}
.hv .broker{margin-top:22px;font-size:15px;color:var(--soft)}
.hv .broker a{color:var(--ink);border-bottom:1px solid var(--berry)}

.hv .steps-wrap{padding:0 16px}
.hv .steps{max-width:1160px;margin:clamp(80px,10vw,130px) auto 0;padding:clamp(56px,7vw,88px) clamp(20px,5vw,64px);border-radius:36px;background:var(--ink);color:#fff;text-align:center}
.hv .steps .kicker{color:#f2a7d4}
.hv .steps h2{margin-top:12px}
.hv .steps ol{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:44px 0 40px;text-align:left}
.hv .steps li{background:rgba(255,255,255,.07);border-radius:22px;padding:24px}
.hv .steps b{display:inline-flex;width:34px;height:34px;border-radius:50%;align-items:center;justify-content:center;background:var(--berry);font-size:15px}
.hv .steps h3{font-size:20px;margin-top:16px;letter-spacing:-.02em;font-weight:600}
.hv .steps li p{margin-top:6px;font-size:15.5px;line-height:1.5;opacity:.72}

.hv .final{text-align:center;padding:clamp(80px,10vw,130px) 16px clamp(64px,8vw,100px);background:radial-gradient(50% 60% at 50% 40%,#fdeef5,#fff 70%)}
.hv .fberry{width:150px;margin:0 auto 18px;-webkit-mask-image:radial-gradient(circle,#000 40%,transparent 64%);mask-image:radial-gradient(circle,#000 40%,transparent 64%);animation:hvfl 5s ease-in-out infinite}
.hv .final .btn{margin-top:30px}

.hv .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;max-width:1160px;margin:0 auto;padding:36px 16px 48px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.hv .fmark{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.hv .fmark img{height:20px;width:auto}
.hv .foot nav{display:flex;gap:22px}
.hv .foot nav a:hover{color:var(--ink)}

@media (max-width:860px){
  .hv .hide-sm{display:none}
  .hv .stage .frame{width:100%}
  .hv .hphone{width:34%;right:2%;bottom:-16px}
  .hv .hberry{width:110px;top:-70px;right:10%}
  .hv .icons{gap:0;border-radius:20px}
  .hv .icons a{padding:8px 6px;font-size:12px;width:33.33%}
  .hv .icons .ic{width:42px;height:42px}
  .hv .meet-in{grid-template-columns:1fr}
  .hv .orbit{max-width:380px}
  .hv .pill{font-size:12.5px;padding:7px 12px 7px 7px}.hv .pill .ic{width:28px;height:28px}
  .hv .p3{right:-2%}.hv .p5{left:0}
  .hv .pin-in{grid-template-columns:1fr;gap:16px;padding-top:76px;align-content:center;height:100%}
  .hv .screen{order:-1;height:40vh}
  .hv .list li{display:none;padding:6px 4px;background:none}
  .hv .list li.on{display:block;background:none}
  .hv .list .row{display:none}
  .hv .list .big,.hv .list .more p:not(.big),.hv .bar{margin-left:0}
  .hv .list .big{margin-top:4px}
  .hv .dots{display:flex;gap:6px;justify-content:center}
  .hv .dots i{width:7px;height:7px;border-radius:50%;background:rgba(22,21,26,.15);transition:all .3s}
  .hv .dots i.on{width:22px;border-radius:4px;background:var(--berry)}
  .hv .sched-in{grid-template-columns:1fr}
  .hv .cards{grid-template-columns:1fr 1fr}
  .hv .price-card{grid-template-columns:1fr}
  .hv .steps ol{grid-template-columns:1fr}
}
@media (max-width:520px){ .hv .cards{grid-template-columns:1fr} }
@media (prefers-reduced-motion:reduce){ .hv *{animation:none!important;transition:none!important} }
`
