// Mockup only: new home page sections that show what Marvberry actually does.
// Not linked anywhere. Same colors, fonts and feel as the live home page.
import type { Metadata } from "next"
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/caveat/500.css"
import BeforeAfter from "./slider"

export const metadata: Metadata = { title: "Mockup — Marvberry", robots: { index: false, follow: false } }

const MESS = ["Texts", "Missed calls", "Email threads", "PDFs to sign", "Calendar back-and-forth", "Listing links"]
const NEAT = ["Bookings", "Agreements", "Offers", "Client updates"]

function Hub() {
  const ly = (i: number) => 40 + i * 64
  const ry = (i: number) => 88 + i * 82
  // Tangled on the left, clean on the right.
  const tangle = [
    "M190 40 C 300 160, 260 300, 500 210",
    "M190 104 C 340 20, 300 360, 500 210",
    "M190 168 C 260 330, 380 60, 500 210",
    "M190 232 C 330 100, 280 280, 500 210",
    "M190 296 C 250 140, 420 380, 500 210",
    "M190 360 C 360 260, 260 90, 500 210",
  ]
  return (
    <svg className="hub" viewBox="0 0 1000 400" role="img" aria-label="Texts, calls, emails, PDFs, calendars and listing links all tangled, then running cleanly through Marvberry into bookings, agreements, offers and client updates">
      {tangle.map((d, i) => (
        <path key={i} d={d} className="tl" />
      ))}
      {NEAT.map((_, i) => (
        <path key={i} d={`M500 210 C 640 210, 640 ${ry(i)}, 790 ${ry(i)}`} className="nl" />
      ))}
      {MESS.map((t, i) => (
        <g key={t}>
          <rect x="10" y={ly(i) - 18} width="180" height="36" rx="18" className="chip-m" />
          <text x="100" y={ly(i) + 5} textAnchor="middle" className="chip-t m">{t}</text>
        </g>
      ))}
      <circle cx="500" cy="210" r="62" className="core" />
      <text x="500" y="217" textAnchor="middle" className="core-t">Marvberry</text>
      {NEAT.map((t, i) => (
        <g key={t}>
          <rect x="790" y={ry(i) - 20} width="190" height="40" rx="20" className="chip-n" />
          <text x="885" y={ry(i) + 5} textAnchor="middle" className="chip-t n">{t}</text>
        </g>
      ))}
    </svg>
  )
}

function Feature({
  hand,
  title,
  lead,
  points,
  flip,
  children,
}: {
  hand: string
  title: string
  lead: string
  points: string[]
  flip?: boolean
  children: React.ReactNode
}) {
  return (
    <article className={`feat${flip ? " flip" : ""}`}>
      <div className="feat-copy">
        <p className="hand gold">{hand}</p>
        <h3>{title}</h3>
        <p className="lead">{lead}</p>
        <ul className="ticks">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="feat-pic">{children}</div>
    </article>
  )
}

export default function PreviewFeatures() {
  return (
    <div className="mf">
      <style>{CSS}</style>
      <p className="mock-flag">Mockup. These sections would sit on the home page, after your story.</p>

      {/* 1. Everything in one place */}
      <section className="one">
        <p className="hand gold">the real problem</p>
        <h2>Your deal lives in six places.</h2>
        <p className="lead c">
          Texts, missed calls, email threads, PDFs, calendars, listing links. You&rsquo;re the only one holding it all
          together. Marvberry puts it in one place, so nothing falls through.
        </p>
        <Hub />
      </section>

      {/* 2. Before and after */}
      <section className="baw">
        <p className="hand gold">see the difference</p>
        <h2>Same buyer. Same deal. One less headache.</h2>
        <p className="lead c">Drag the line to see it.</p>
        <BeforeAfter />
      </section>

      {/* 3. What it does */}
      <section className="what">
        <p className="hand gold">a solid foundation</p>
        <h2>Everything your deals run on. Set up with you.</h2>
        <p className="lead c">No tech skills. We build it with you, then you just use it.</p>

        <Feature
          hand="booking"
          title="Booking built around real estate."
          lead="One link with your name and your hours. Buyers pick a time that works for you, and you never go back and forth."
          points={[
            "Your days, your hours, your days off",
            "Video or phone, your buyer picks",
            "Notice time, so nobody books you in an hour",
            "Confirmations and reminders sent for you",
            "Buyers can reschedule or cancel themselves",
          ]}
        >
          <div className="ui">
            <p className="ui-k">Book with Samantha</p>
            <div className="days">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
                <span key={d} className={i === 2 ? "on" : ""}>{d}</span>
              ))}
            </div>
            <div className="slots">
              {["10:00 AM", "11:30 AM", "1:00 PM", "3:30 PM"].map((t, i) => (
                <span key={t} className={i === 1 ? "on" : ""}>{t}</span>
              ))}
            </div>
            <p className="ui-foot">Wednesday · 11:30 AM · Video call</p>
          </div>
        </Feature>

        <Feature
          flip
          hand="agreements"
          title="Agreements, signed from their phone."
          lead="Your own agreement, already filled in with your terms. Send it in one click. They sign in about a minute."
          points={[
            "Your templates, with the blanks filled in for you",
            "Signed from any phone, no app, no account",
            "See right away who signed and who hasn't",
            "Every signed copy saved under their name",
          ]}
        >
          <div className="ui">
            <p className="ui-k">Buyer Agreement · Jordan Taylor</p>
            <p className="ui-line">Term: 90 days · Exclusive</p>
            <p className="ui-line">Compensation: 2.5%</p>
            <p className="sigline">Jordan Taylor</p>
            <p className="ui-ok">Signed today at 9:14 AM</p>
          </div>
        </Feature>

        <Feature
          hand="offers"
          title="Your offer, ready in minutes."
          lead="Paste the listing link and the home is added for you. Your buyer's documents are already in. Marvberry builds the offer, you look it over and send it."
          points={[
            "Paste a Zillow or realtor.com link, and the home is added",
            "Your buyer uploads their own documents",
            "The offer goes straight to the listing agent",
            "Your buyer sees “Offer sent” on their page",
          ]}
        >
          <div className="ui">
            <p className="ui-k">Offer · 18 Elm Rd</p>
            <p className="ui-big">$545,000</p>
            <p className="ui-line">Pre-approval, ID, proof of funds attached</p>
            <p className="ui-line">To: David Chen, Keller Williams</p>
            <p className="ui-ok">Sent in 4 minutes</p>
          </div>
        </Feature>

        <Feature
          flip
          hand="follow-up"
          title="Follow up on the deal, not just the lead."
          lead="Marvberry keeps every deal moving. It writes the reminder, flags the offer that's about to run out, and tells you each morning what matters."
          points={[
            "Reminders to your buyers, written in your voice",
            "Offer follow-ups, already written",
            "A short morning update on every deal",
            "You approve everything. It all goes out in your name.",
          ]}
        >
          <div className="ui">
            <p className="ui-k">Good morning, Samantha</p>
            <p className="ui-line">Jordan&rsquo;s proof of funds is due today. A reminder is ready.</p>
            <p className="ui-line">Your offer on 18 Elm Rd runs out tomorrow. The follow-up is written.</p>
            <p className="ui-ok">2 things today. That&rsquo;s it.</p>
          </div>
        </Feature>

        <div className="cta">
          <a className="btn" href="/signup">Try Marvberry</a>
          <p className="fine">14 days free. No credit card.</p>
        </div>
      </section>
    </div>
  )
}

const CSS = `
.mf{--linen:#FFFFFF; --cream:#F6EFE5; --espresso:#2A221C; --ink:#2A221C; --body:#6B6158; --muted:#9A8F84;
  --gold:#C9A46C; --rust:#8F4E2A; --sun:#FFBD59; --rule:#E7DED1;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  background:var(--linen); color:var(--ink); font-family:var(--sans)}
.mf *{box-sizing:border-box}
.mf h2,.mf h3{font-family:var(--serif); font-weight:400; margin:0; letter-spacing:-.01em}
.mf p{margin:0}
.mf .hand{font-family:var(--hand); font-size:30px; line-height:1}
.mf .gold{color:var(--gold)}
.mf .mock-flag{background:var(--espresso); color:var(--cream); text-align:center; font-size:13px; padding:10px}
.mf section{padding:110px clamp(20px,5vw,72px); text-align:center}
.mf section h2{font-size:clamp(34px,1.4rem + 2.4vw,56px); line-height:1.1; margin-top:10px}
.mf .lead{font-size:clamp(17px,.95rem + .3vw,20px); line-height:1.65; color:var(--body)}
.mf .lead.c{max-width:40rem; margin:18px auto 0}
.mf .btn{display:inline-block; background:var(--espresso); color:var(--cream); text-decoration:none; font-size:15.5px; font-weight:500; padding:15px 30px; border-radius:999px}
.mf .fine{margin-top:12px; font-size:13.5px; color:var(--muted)}

.mf .one{background:var(--cream)}
.mf .hub{display:block; width:100%; max-width:1000px; margin:56px auto 0}
.mf .tl{fill:none; stroke:var(--rust); stroke-opacity:.35; stroke-width:1.5}
.mf .nl{fill:none; stroke:var(--espresso); stroke-width:2}
.mf .chip-m{fill:#fff; stroke:var(--rule)}
.mf .chip-n{fill:var(--espresso)}
.mf .chip-t{font-family:var(--sans); font-size:14px}
.mf .chip-t.m{fill:var(--body)}
.mf .chip-t.n{fill:var(--cream); font-weight:500}
.mf .core{fill:var(--espresso); stroke:var(--gold); stroke-width:3}
.mf .core-t{fill:var(--cream); font-family:var(--serif); font-size:19px}

.mf .ba{max-width:980px; margin:48px auto 0}
.mf .ba-frame{position:relative; height:440px; border-radius:24px; overflow:hidden; border:1px solid var(--rule); text-align:left; user-select:none}
.mf .ba-pane{position:absolute; inset:0; padding:28px}
.mf .ba-pane.after{background:var(--cream); display:flex; flex-direction:column; align-items:flex-end}
.mf .ba-pane.before{background:#E9E6E2}
.mf .ba-tag{font-family:var(--serif); font-style:italic; font-size:clamp(30px,1.2rem + 1.6vw,44px); line-height:1; color:var(--ink); margin-bottom:18px}
.mf .after .ba-tag{align-self:flex-end}
.mf .mess{max-width:380px; display:flex; flex-direction:column; gap:8px; transform:rotate(-1.2deg)}
.mf .mess .b{max-width:80%; padding:9px 13px; border-radius:16px; font-size:14px; line-height:1.4}
.mf .mess .l{background:#fff; align-self:flex-start}
.mf .mess .r{background:#cfd8e3; align-self:flex-end}
.mf .mess .call{align-self:flex-start; font-size:13px; color:#b42318; background:#fde8e6; padding:6px 12px; border-radius:999px}
.mf .mess .mail{align-self:flex-start; font-size:13px; color:var(--body); background:#fff; border:1px dashed #c7c0b8; padding:6px 12px; border-radius:8px}
.mf .deal{width:390px; background:#fff; border:1px solid var(--rule); border-radius:18px; padding:20px 22px; box-shadow:0 24px 48px -28px rgba(42,34,28,.35)}
.mf .deal-head{display:flex; gap:12px; align-items:center}
.mf .av{width:40px; height:40px; border-radius:50%; background:var(--cream); display:flex; align-items:center; justify-content:center; font-family:var(--serif)}
.mf .deal-name{font-family:var(--serif); font-size:20px}
.mf .deal-sub{font-size:12.5px; color:var(--muted)}
.mf .deal-track{list-style:none; padding:0; margin:16px 0 6px; display:flex; gap:8px}
.mf .deal-track li{flex:1; text-align:center; font-size:12px; padding:6px 0; border-radius:999px; background:#f4efe8; color:var(--muted)}
.mf .deal-track li.d{background:var(--gold); color:#fff}
.mf .deal-track li.n{background:var(--espresso); color:var(--cream)}
.mf .deal-rows{list-style:none; padding:0; margin:0}
.mf .deal-rows li{display:flex; justify-content:space-between; gap:10px; padding:9px 0; border-bottom:1px solid #f0ebe4; font-size:13.5px}
.mf .deal-rows em{font-style:normal; color:#2f7f5e; white-space:nowrap}
.mf .deal-note{margin-top:12px; font-size:12.5px; color:var(--body)}
.mf .ba-handle{position:absolute; top:0; bottom:0; width:1px; background:rgba(42,34,28,.55); pointer-events:none; transition:left .45s cubic-bezier(.3,.7,.2,1)}
.mf .ba-pane.before{transition:clip-path .45s cubic-bezier(.3,.7,.2,1)}
.mf .ba-frame:active .ba-handle,.mf .ba-frame:active .ba-pane.before{transition:none}
.mf .knob{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:max-content; height:58px; padding:0 14px; border-radius:999px; display:flex; align-items:center; gap:10px;
  background:rgba(246,239,229,.55); -webkit-backdrop-filter:saturate(1.5) blur(14px); backdrop-filter:saturate(1.5) blur(14px);
  border:1px solid rgba(255,255,255,.75); box-shadow:0 12px 28px -10px rgba(42,34,28,.45), inset 0 1px 0 rgba(255,255,255,.7)}
.mf .knob img{height:20px; width:auto; display:block}
.mf .knob i{font-style:normal; font-size:20px; line-height:1; color:var(--ink); opacity:.7}
.mf .ba-range{position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:ew-resize; margin:0}

.mf .what{background:var(--linen)}
.mf .feat{display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; max-width:1080px; margin:96px auto 0; text-align:left}
.mf .feat.flip .feat-copy{order:2}
.mf .feat h3{font-size:clamp(28px,1.1rem + 1.6vw,40px); line-height:1.15; margin:8px 0 14px}
.mf .ticks{list-style:none; padding:0; margin:20px 0 0}
.mf .ticks li{position:relative; padding:8px 0 8px 30px; border-bottom:1px solid var(--rule); font-size:15.5px}
.mf .ticks li::before{content:"\\2713"; position:absolute; left:4px; color:var(--rust)}
.mf .feat-pic{background:var(--cream); border-radius:24px; padding:44px; display:flex; justify-content:center}
.mf .ui{width:100%; max-width:340px; background:#fff; border:1px solid var(--rule); border-radius:18px; padding:22px; box-shadow:0 24px 48px -28px rgba(42,34,28,.3)}
.mf .ui-k{font-family:var(--serif); font-size:19px; margin-bottom:14px}
.mf .ui-line{font-size:13.5px; color:var(--body); padding:7px 0; border-bottom:1px solid #f0ebe4}
.mf .ui-big{font-family:var(--serif); font-size:32px; margin-bottom:6px}
.mf .ui-ok{margin-top:14px; font-size:13px; color:#2f7f5e; font-weight:500}
.mf .ui-foot{margin-top:14px; font-size:13px; color:var(--body)}
.mf .sigline{font-family:var(--hand); font-size:30px; margin-top:16px; padding-bottom:4px; border-bottom:1px solid var(--ink); width:70%}
.mf .days,.mf .slots{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px}
.mf .days span,.mf .slots span{font-size:12.5px; padding:7px 11px; border-radius:10px; border:1px solid var(--rule)}
.mf .days span.on,.mf .slots span.on{background:var(--espresso); color:var(--cream); border-color:var(--espresso)}
.mf .cta{margin-top:96px}

@media (max-width:860px){
  .mf .feat{grid-template-columns:1fr; gap:28px}
  .mf .feat.flip .feat-copy{order:0}
  .mf .ba-frame{height:520px}
  .mf .deal{width:100%}
}
`
