// Marvberry home page, editorial edition: a magazine you read, with the index
// pinned on the left while the pages scroll on the right.
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/playfair-display/500.css"
import "@fontsource/caveat/500.css"

const CALL = "/chat"

const SECTIONS = [
  { id: "top", label: "The tool" },
  { id: "day", label: "Your day, handled" },
  { id: "setup", label: "We set it up" },
  { id: "note", label: "A note from Alecia" },
  { id: "pricing", label: "Pricing" },
  { id: "questions", label: "Questions" },
]

const SPINE = [
  {
    tag: "Booked",
    title: "Get booked.",
    body: "Share one link and your calendar fills itself. Clients pick a time that works, and you stop playing phone tag to set a single showing. No more back-and-forth. You just see it show up.",
  },
  {
    tag: "Signed",
    title: "Get signed.",
    body: "The moment a client says yes, you send the paperwork and they sign from their phone. You're not printing, scanning, or chasing anyone down for a signature, so you move from yes to under contract faster.",
  },
  {
    tag: "Closed",
    title: "Close more deals.",
    body: "Everything lives in one place, so nothing slips through the cracks and no client feels forgotten. You handle more deals at once without the chaos, which means more closings without more hours.",
  },
]

const PLANS = [
  {
    name: "Solo Agent",
    price: "$39",
    per: "a month",
    blurb: "Everything one realtor runs a business on.",
    items: ["Your booking link", "Calendar on your phone", "Agreements signed from a phone", "A private page for every client", "Free setup call"],
    cta: "Book my free setup call",
    href: CALL,
  },
  {
    name: "Brokerage",
    price: "From $149",
    per: "a month",
    blurb: "Your whole team on Marvberry, set up around how you work.",
    items: ["First five agents included", "About $30 for each agent after", "Your agreements and steps for the team", "Setup for every agent"],
    cta: "Talk to us",
    href: CALL,
  },
  {
    name: "Brand Touch",
    price: "From $1,200",
    per: "one time",
    blurb: "Your client emails, texts, and booking page, written in your voice.",
    items: ["A session on how you sound", "Every client message rewritten", "Your booking page words", "Added to any plan"],
    cta: "Ask about it",
    href: CALL,
  },
]

const FAQ = [
  ["How is Marvberry different from Calendly?", "Calendly books the meeting and stops there. Marvberry keeps going: the agreement, the signature, the documents, and a page where your client sees what's next."],
  ["Do my clients need an account?", "No. Clients get a private link. They book, sign, and upload without a password or an app."],
  ["Does it work on my phone?", "Yes. Marvberry works on your phone and your computer, the same business either way."],
  ["What if it isn't right for me?", "You have 30 days. If Marvberry isn't for you, tell us and we'll refund you in full. Cancel anytime."],
]

export default function Editorial() {
  return (
    <div className="ed">
      <style>{CSS}</style>

      <aside className="rail" aria-label="Sections">
        <a href="#top" className="mark">
          <img src="/marvberry-mark.png" alt="" width={28} height={28} />
          <span>Marvberry</span>
        </a>
        <nav className="index">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="rail-foot">
          <a className="btn" href={CALL}>Book my free setup call</a>
          <a className="quiet" href="/login">Log in</a>
          <p className="motto">Move forward.</p>
        </div>
      </aside>

      <header className="topbar">
        <a href="#top" className="mark">
          <img src="/marvberry-mark.png" alt="" width={24} height={24} />
          <span>Marvberry</span>
        </a>
        <a className="quiet" href="/login">Log in</a>
        <a className="btn sm" href={CALL}>Book a call</a>
      </header>

      <main className="pages">
        <section id="top" className="hero">
          <p className="eyebrow">Made for solo realtors</p>
          <h1>
            The tool busy realtors use to close more and <em>chase less.</em>
          </h1>
          <div className="hero-sub">
            <p>
              Marvberry books your clients, gets your agreements signed, and keeps every deal in one place. Built for
              solo realtors, and we set it all up for you.
            </p>
            <a className="btn" href={CALL}>Book my free setup call</a>
          </div>
          <figure className="film">
            <span className="film-note" aria-hidden="true">the real thing, start to finish</span>
            <video
              poster="/marvberry-demo-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="A short demo of Marvberry: a client books, becomes a client, and signs their agreement from their phone"
            >
              <source src="/marvberry-demo.mp4" type="video/mp4" />
              <source src="/marvberry-demo.webm" type="video/webm" />
            </video>
            <figcaption>A client books, becomes your client, and signs from their phone.</figcaption>
          </figure>
        </section>

        <section className="pain">
          <h2>You close deals most people can&rsquo;t.</h2>
          <div className="cols">
            <p>
              And you&rsquo;re still the one answering at nine at night. Still chasing the same signature, twice. Still
              digging through three devices to find who said what.
            </p>
            <p>
              And the client notices. You haven&rsquo;t slowed down. You&rsquo;ve outgrown the tools you were handed.
            </p>
          </div>
        </section>

        <section id="day" className="spine">
          <p className="eyebrow">Your day, handled</p>
          <h2>Get booked, get signed, close more deals.</h2>
          <div className="three">
            {SPINE.map((s) => (
              <article key={s.title}>
                <p className="tag">{s.tag}</p>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="setup" className="setup">
          <blockquote>
            <p>You&rsquo;re not setting anything up. We do it with you, on a free call, in about thirty minutes.</p>
          </blockquote>
          <div className="cols">
            <p>
              Book a call. Bring your brokerage details, a photo, your hours, and the agreement you use with clients.
              While you watch, we build your booking page, your client steps, and your agreement, so your link works
              before we hang up.
            </p>
            <p>
              Then you have 30 days to love it. If Marvberry isn&rsquo;t for you, tell us and we&rsquo;ll refund you in
              full.
            </p>
          </div>
        </section>

        <section id="note" className="note">
          <div className="paper">
          <p className="hand">A note from Alecia</p>
          <div className="note-body">
            <p>
              I trained to become a realtor, and I found out fast that the selling wasn&rsquo;t the hard part. It was
              everything behind it. The texts, the paperwork, the client who just wanted to know what happens next.
            </p>
            <p>
              I&rsquo;ve spent years running operations for large companies, and I kept seeing the same thing: when a
              business struggles, it&rsquo;s rarely the product. It&rsquo;s the experience. So I built Marvberry to give a
              solo agent the back office of a full team, without one more thing to learn.
            </p>
            <p>You take care of your clients. Let Marvberry handle the rest.</p>
          </div>
          <p className="sign">Alecia Ford</p>
          <p className="sign-role">Founder, Marvberry</p>
          </div>
        </section>

        <section id="pricing" className="pricing">
          <div className="frame">
            <header className="masthead">
              <p className="eyebrow">Pricing</p>
              <h2>Simple, and set up for you.</h2>
              <p>One price for your business, and a free call to set it up.</p>
            </header>
            <div className="plans">
              {PLANS.map((p) => (
                <article key={p.name} className="plan">
                  <h3>{p.name}</h3>
                  <p className="price">
                    {p.price} <span>{p.per}</span>
                  </p>
                  <p className="blurb">{p.blurb}</p>
                  <ul>
                    {p.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                  <a className={p.name === "Solo Agent" ? "btn light" : "btn ghost-light"} href={p.href}>
                    {p.cta}
                  </a>
                </article>
              ))}
            </div>
            <p className="frame-foot">Every plan comes with a 30-day money-back guarantee.</p>
          </div>
        </section>

        <section id="questions" className="faq">
          <h2>Questions</h2>
          <div className="qa">
            {FAQ.map(([q, a]) => (
              <div key={q}>
                <h3>{q}</h3>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="close">
          <p className="hand">we&rsquo;ve got you</p>
          <h2>I&rsquo;ll take it from here. You take the day.</h2>
          <a className="btn" href={CALL}>Book my free setup call</a>
        </section>

        <footer className="foot">
          <p className="foot-mark">
            <img src="/marvberry-mark.png" alt="" width={22} height={22} /> Marvberry. <em>Move forward.</em>
          </p>
          <p>
            <a href="/login">Log in</a>
            <a href="/support">Support</a>
          </p>
        </footer>
      </main>
    </div>
  )
}

const CSS = `
.ed{
  --linen:#FBFBF6; --stone:#F4EFE8; --greige:#ECEAE3; --olive:#3D3A2F; --olive-2:#4A4739;
  --ink:#2E2C25; --body:#66625A; --muted:#97928A; --rule:#E2DDD4;
  --rasp:#CE6385; --pink:#E89BB4; --peach:#F3C7B4;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  color-scheme: light; background:var(--linen); color:var(--ink); font-family:var(--sans);
  display:grid; grid-template-columns: 252px minmax(0,1fr); min-height:100vh;
}
.ed *{box-sizing:border-box}
.ed a{color:inherit}
.ed :focus-visible{outline:2px solid var(--rasp); outline-offset:3px; border-radius:4px}
.ed em{font-style:italic}

/* The rail: pinned, soft stone, words only */
.ed .rail{position:sticky; top:0; height:100vh; display:flex; flex-direction:column; padding:34px 28px 30px; background:var(--stone)}
.ed .mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--serif); font-size:21px; color:var(--ink)}
.ed .mark img{border-radius:7px}
.ed .index{margin-top:64px; display:flex; flex-direction:column; gap:4px}
.ed .index a{padding:9px 0; text-decoration:none; font-size:15px; color:var(--body); transition:color .2s}
.ed .index a:hover{color:var(--rasp)}
.ed .rail-foot{margin-top:auto; display:flex; flex-direction:column; gap:14px}
.ed .rail-foot .btn{text-align:center; font-size:14px; padding:12px 14px}
.ed .quiet{font-size:14px; color:var(--body); text-decoration:none}
.ed .quiet:hover{text-decoration:underline; text-underline-offset:4px}
.ed .motto{margin:4px 0 0; font-family:var(--hand); font-size:26px; line-height:1; color:var(--rasp)}
.ed .topbar{display:none}

.ed .btn{display:inline-block; background:var(--olive); color:#FBFBF6; text-decoration:none; font-size:15px; font-weight:500; padding:13px 26px; border-radius:999px; border:1px solid var(--olive); transition:background .2s, color .2s}
.ed .btn:hover{background:#2a2820}
.ed .btn.light{background:#FBFBF6; color:var(--olive); border-color:#FBFBF6}
.ed .btn.light:hover{background:var(--pink); border-color:var(--pink)}
.ed .btn.ghost-light{background:transparent; color:#FBFBF6; border-color:rgba(251,251,246,.55)}
.ed .btn.ghost-light:hover{border-color:#FBFBF6; background:rgba(251,251,246,.08)}
.ed .btn.sm{padding:9px 16px; font-size:14px}

.ed .eyebrow{font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; font-weight:500; color:var(--body); margin:0 0 22px}
.ed .hand{font-family:var(--hand); color:var(--rasp)}

/* The pages: bands of linen, stone, greige, olive */
.ed .pages{min-width:0}
.ed section{padding:clamp(72px,9vw,124px) clamp(28px,6vw,96px)}
.ed section > *{max-width:1040px}
.ed h1,.ed h2,.ed h3{font-family:var(--serif); font-weight:400; margin:0; letter-spacing:-.01em; color:var(--ink)}
.ed p{margin:0}

.ed .hero{padding-top:clamp(64px,8vw,112px)}
.ed .hero h1{font-size:clamp(42px,1.5rem + 4vw,86px); line-height:1.04; max-width:14ch}
.ed .hero h1 em{color:var(--rasp)}
.ed .hero-sub{margin-top:34px; display:grid; grid-template-columns:minmax(0,33rem) auto; gap:24px 48px; align-items:end}
.ed .hero-sub p{font-size:19px; line-height:1.6; color:var(--body)}
.ed .hero-sub .btn{justify-self:start}
.ed .film{position:relative; margin:64px 0 0; padding:clamp(14px,2vw,26px); background:var(--greige); border-radius:22px}
.ed .film video{display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; background:#5f5853; border-radius:12px; filter:sepia(.08) saturate(.94) contrast(.98); box-shadow:0 24px 60px -30px rgba(61,58,47,.45)}
.ed .film-note{position:absolute; top:-34px; right:28px; font-family:var(--hand); font-size:26px; color:var(--rasp); transform:rotate(-3deg)}
.ed .film figcaption{margin:16px 6px 2px; font-size:14px; color:var(--body)}

.ed .pain{background:var(--greige)}
.ed .pain h2,.ed .spine h2,.ed .faq h2{font-size:clamp(32px,1.2rem + 2.4vw,56px); line-height:1.08; max-width:18ch}
.ed .cols{margin-top:34px; columns:2 22rem; column-gap:56px}
.ed .cols p{font-size:18px; line-height:1.7; color:var(--body); break-inside:avoid; margin-bottom:1.1em}

.ed .three{margin-top:52px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px}
.ed .three article{padding:30px 28px 34px; background:var(--stone); border-radius:20px}
.ed .three .tag{display:inline-block; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--rasp); font-weight:600; margin-bottom:18px}
.ed .three h3{font-size:28px; font-style:italic}
.ed .three p:not(.tag){margin-top:14px; font-size:16.5px; line-height:1.7; color:var(--body)}

.ed .setup{background:var(--stone); text-align:center}
.ed .setup > *{margin-left:auto; margin-right:auto}
.ed .setup blockquote{margin:0 auto}
.ed .setup blockquote p{font-family:var(--serif); font-size:clamp(30px,1.1rem + 2.2vw,50px); line-height:1.18; max-width:22ch; margin:0 auto}
.ed .setup .cols{text-align:left; max-width:860px}

/* Alecia's note: a paper card on greige */
.ed .note{background:var(--greige)}
.ed .note .paper{margin:0 auto; max-width:640px; background:#FFFEFA; padding:clamp(36px,5vw,64px) clamp(26px,5vw,64px); border-radius:4px; box-shadow:0 1px 0 rgba(61,58,47,.06), 0 30px 60px -36px rgba(61,58,47,.4); text-align:center}
.ed .note .hand{font-size:40px}
.ed .note-body{margin:24px auto 0; text-align:left}
.ed .note-body p{font-family:var(--serif); font-size:19px; line-height:1.75; color:#4a463d; margin-bottom:1em}
.ed .note .sign{margin-top:14px; font-family:var(--hand); font-size:48px; line-height:1; color:var(--rasp)}
.ed .note .sign-role{margin-top:6px; font-size:13.5px; color:var(--muted)}

/* Pricing: the olive room, a thin cream frame */
.ed .pricing{background:var(--olive); color:#FBFBF6}
.ed .pricing > *{max-width:1100px}
.ed .frame{border:1px solid rgba(251,251,246,.5); padding:10px; border-radius:6px}
.ed .masthead{text-align:center; padding:46px 24px 38px; border-bottom:1px solid rgba(251,251,246,.25)}
.ed .masthead .eyebrow{color:var(--pink); margin-bottom:16px}
.ed .masthead h2{font-size:clamp(36px,1.3rem + 2.4vw,60px); font-style:italic; color:#FBFBF6}
.ed .masthead p:not(.eyebrow){margin-top:12px; font-size:16px; color:rgba(251,251,246,.72)}
.ed .plans{display:grid; grid-template-columns:repeat(3,minmax(0,1fr))}
.ed .plan{padding:36px 30px 38px; display:flex; flex-direction:column}
.ed .plan + .plan{border-left:1px solid rgba(251,251,246,.2)}
.ed .plan h3{font-size:25px; color:#FBFBF6}
.ed .plan .price{margin-top:14px; font-family:var(--serif); font-size:42px; line-height:1}
.ed .plan .price span{display:block; margin-top:8px; font-family:var(--sans); font-size:14px; color:rgba(251,251,246,.6)}
.ed .plan .blurb{margin-top:14px; font-size:15.5px; line-height:1.6; color:rgba(251,251,246,.78); min-height:3.2em}
.ed .plan ul{list-style:none; margin:22px 0 30px; padding:0; border-top:1px solid rgba(251,251,246,.2)}
.ed .plan li{padding:10px 0; border-bottom:1px solid rgba(251,251,246,.2); font-size:15px; color:rgba(251,251,246,.9)}
.ed .plan .btn{margin-top:auto; text-align:center}
.ed .frame-foot{text-align:center; padding:18px; border-top:1px solid rgba(251,251,246,.25); font-family:var(--hand); font-size:24px; color:var(--pink)}

.ed .qa{margin-top:44px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:36px 56px}
.ed .qa > div{padding-top:22px; border-top:1px solid var(--rule)}
.ed .qa h3{font-size:21px}
.ed .qa p{margin-top:10px; font-size:16px; line-height:1.7; color:var(--body)}

.ed .close{background:var(--stone); text-align:center}
.ed .close > *{margin-left:auto; margin-right:auto}
.ed .close .hand{font-size:34px; transform:rotate(-2deg); margin-bottom:10px}
.ed .close h2{font-size:clamp(38px,1.4rem + 3.2vw,76px); line-height:1.05; max-width:15ch; font-style:italic}
.ed .close .btn{margin-top:36px}
.ed .foot{display:flex; justify-content:space-between; align-items:center; gap:20px; padding:36px clamp(28px,6vw,96px) 44px; background:var(--olive); font-size:14px; color:rgba(251,251,246,.7)}
.ed .foot-mark{display:flex; align-items:center; gap:10px; font-family:var(--serif); font-size:17px; color:#FBFBF6}
.ed .foot-mark img{border-radius:6px}
.ed .foot-mark em{color:var(--pink)}
.ed .foot a{margin-left:22px; text-decoration:none}
.ed .foot a:hover{color:#FBFBF6}

/* Phones and narrow screens: the rail folds into a slim top bar */
@media (max-width: 900px){
  .ed{grid-template-columns:1fr}
  .ed .rail{display:none}
  .ed .topbar{display:flex; align-items:center; gap:16px; position:sticky; top:0; z-index:5; padding:14px 20px; background:rgba(244,239,232,.94); backdrop-filter:blur(8px)}
  .ed .topbar .mark{margin-right:auto; font-size:19px}
  .ed section{padding-left:20px; padding-right:20px}
  .ed .hero-sub{grid-template-columns:1fr}
  .ed .three,.ed .plans,.ed .qa{grid-template-columns:1fr}
  .ed .plan + .plan{border-left:0; border-top:1px solid rgba(251,251,246,.25)}
  .ed .film-note{top:-30px; right:12px; font-size:22px}
  .ed .note .paper{transform:none}
  .ed .foot{flex-direction:column; align-items:flex-start; padding:32px 20px 40px}
  .ed .foot a{margin:0 20px 0 0}
}
@media (prefers-reduced-motion: reduce){ .ed .btn,.ed .index a{transition:none} }
`
