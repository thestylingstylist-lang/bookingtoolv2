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
    title: "Get booked.",
    body: "Share one link and your calendar fills itself. Clients pick a time that works, and you stop playing phone tag to set a single showing. No more back-and-forth. You just see it show up.",
  },
  {
    title: "Get signed.",
    body: "The moment a client says yes, you send the paperwork and they sign from their phone. You're not printing, scanning, or chasing anyone down for a signature, so you move from yes to under contract faster.",
  },
  {
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
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}>
              <span className="pg">{String(i + 1).padStart(2, "0")}</span>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="rail-foot">
          <a className="btn" href={CALL}>Book my free setup call</a>
          <a className="quiet" href="/login">Log in</a>
          <p className="motto">Marvberry. Move forward.</p>
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
          <h1>The tool busy realtors use to close more and chase less.</h1>
          <div className="hero-sub">
            <p>
              Marvberry books your clients, gets your agreements signed, and keeps every deal in one place. Built for
              solo realtors, and we set it all up for you.
            </p>
            <a className="btn" href={CALL}>Book my free setup call</a>
          </div>
          <figure className="film">
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
            <figcaption>The real product, start to finish: a client books, becomes your client, and signs from their phone.</figcaption>
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
          <h2>Get booked, get signed, close more deals.</h2>
          <div className="three">
            {SPINE.map((s) => (
              <article key={s.title}>
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
        </section>

        <section id="pricing" className="pricing">
          <div className="frame">
            <header className="masthead">
              <h2>Pricing</h2>
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
                  <a className={p.name === "Solo Agent" ? "btn" : "btn ghost"} href={p.href}>
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
          <h2>I&rsquo;ll take it from here. You take the day.</h2>
          <a className="btn" href={CALL}>Book my free setup call</a>
        </section>

        <footer className="foot">
          <p>Marvberry. Move forward.</p>
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
  --paper:#FBFAF8; --ink:#16151A; --body:#4E4C53; --muted:#8B8890; --rule:#DAD5CE; --berry:#B83A66; --blush:#F7ECEF;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  color-scheme: light; background:var(--paper); color:var(--ink); font-family:var(--sans);
  display:grid; grid-template-columns: 264px minmax(0,1fr); min-height:100vh;
}
.ed *{box-sizing:border-box}
.ed a{color:inherit}
.ed :focus-visible{outline:2px solid var(--berry); outline-offset:3px; border-radius:2px}

/* The index: pinned while the pages move */
.ed .rail{position:sticky; top:0; height:100vh; display:flex; flex-direction:column; padding:36px 28px 32px; border-right:1px solid var(--rule)}
.ed .mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--serif); font-size:21px}
.ed .mark img{border-radius:6px}
.ed .index{margin-top:56px; display:flex; flex-direction:column}
.ed .index a{display:flex; align-items:baseline; gap:14px; padding:11px 0; border-top:1px solid var(--rule); text-decoration:none; font-size:14.5px; color:var(--body)}
.ed .index a:last-child{border-bottom:1px solid var(--rule)}
.ed .index a:hover{color:var(--ink)}
.ed .index .pg{font-family:var(--serif); font-style:italic; font-size:13px; color:var(--muted); width:20px}
.ed .rail-foot{margin-top:auto; display:flex; flex-direction:column; gap:14px}
.ed .rail-foot .btn{text-align:center; font-size:14px; padding:12px 14px}
.ed .quiet{font-size:14px; color:var(--body); text-decoration:none}
.ed .quiet:hover{text-decoration:underline; text-underline-offset:4px}
.ed .motto{margin:6px 0 0; font-family:var(--serif); font-style:italic; font-size:14px; color:var(--muted)}
.ed .topbar{display:none}

.ed .btn{display:inline-block; background:var(--ink); color:#fff; text-decoration:none; font-size:15px; font-weight:500; padding:13px 22px; border-radius:999px; border:1px solid var(--ink); transition:opacity .2s}
.ed .btn:hover{opacity:.86}
.ed .btn.ghost{background:transparent; color:var(--ink)}
.ed .btn.sm{padding:9px 16px; font-size:14px}

/* The pages */
.ed .pages{min-width:0; padding:0 clamp(28px,6vw,96px)}
.ed section{padding:clamp(72px,10vw,128px) 0; border-top:1px solid var(--rule); max-width:1040px}
.ed section:first-child{border-top:0}
.ed h1,.ed h2,.ed h3{font-family:var(--serif); font-weight:400; margin:0; letter-spacing:-.01em}
.ed p{margin:0}

.ed .hero{padding-top:clamp(72px,9vw,120px)}
.ed .hero h1{font-size:clamp(44px,1.6rem + 4.2vw,92px); line-height:1.02; max-width:13ch}
.ed .hero-sub{margin-top:36px; display:grid; grid-template-columns:minmax(0,34rem) auto; gap:24px 48px; align-items:end}
.ed .hero-sub p{font-size:19px; line-height:1.6; color:var(--body)}
.ed .hero-sub .btn{justify-self:start}
.ed .film{margin:56px 0 0}
.ed .film video{display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; background:#5f5853; border:1px solid var(--rule)}
.ed .film figcaption{margin-top:14px; font-family:var(--serif); font-style:italic; font-size:15px; color:var(--muted); max-width:52ch}

.ed .pain h2,.ed .spine h2,.ed .faq h2{font-size:clamp(32px,1.2rem + 2.4vw,56px); line-height:1.08; max-width:18ch}
.ed .cols{margin-top:36px; columns:2 22rem; column-gap:48px}
.ed .cols p{font-size:18px; line-height:1.7; color:var(--body); break-inside:avoid; margin-bottom:1.1em}

.ed .three{margin-top:52px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:0}
.ed .three article{padding:22px 28px 0 0; border-top:1px solid var(--ink)}
.ed .three article + article{padding-left:28px; border-left:1px solid var(--rule)}
.ed .three h3{font-size:27px; font-style:italic}
.ed .three p{margin-top:16px; font-size:16.5px; line-height:1.7; color:var(--body)}

.ed .setup blockquote{margin:0}
.ed .setup blockquote p{font-family:var(--serif); font-size:clamp(30px,1.1rem + 2.3vw,52px); line-height:1.15; max-width:20ch}

/* A quiet page in the middle of the magazine */
.ed .note + section{border-top:0}
.ed .note{text-align:center; max-width:none; background:var(--blush); margin:0 calc(-1 * clamp(28px,6vw,96px)); padding-left:clamp(28px,6vw,96px); padding-right:clamp(28px,6vw,96px)}
.ed .note .hand{font-family:var(--hand); font-size:40px; color:var(--berry)}
.ed .note-body{margin:28px auto 0; max-width:36rem}
.ed .note-body p{font-family:var(--serif); font-size:20px; line-height:1.75; color:#3d3a41; margin-bottom:1em}
.ed .note .sign{margin-top:18px; font-family:var(--hand); font-size:44px; line-height:1}
.ed .note .sign-role{margin-top:6px; font-size:14px; color:var(--muted)}

/* Pricing: three plans inside one ruled frame */
.ed .pricing{max-width:1100px}
.ed .frame{border:1px solid var(--ink); padding:10px}
.ed .frame > *{border-left:1px solid var(--rule); border-right:1px solid var(--rule)}
.ed .masthead{text-align:center; padding:44px 24px 34px; border-top:1px solid var(--rule); border-bottom:1px solid var(--ink)}
.ed .masthead h2{font-size:clamp(40px,1.4rem + 2.6vw,64px); font-style:italic}
.ed .masthead p{margin-top:10px; font-size:16px; color:var(--body)}
.ed .plans{display:grid; grid-template-columns:repeat(3,minmax(0,1fr))}
.ed .plan{padding:34px 30px 36px; display:flex; flex-direction:column}
.ed .plan + .plan{border-left:1px solid var(--rule)}
.ed .plan h3{font-size:26px}
.ed .plan .price{margin-top:14px; font-family:var(--serif); font-size:40px; line-height:1}
.ed .plan .price span{display:block; margin-top:8px; font-family:var(--sans); font-size:14px; color:var(--muted)}
.ed .plan .blurb{margin-top:14px; font-size:15.5px; line-height:1.6; color:var(--body); min-height:3.2em}
.ed .plan ul{list-style:none; margin:22px 0 28px; padding:0; border-top:1px solid var(--rule)}
.ed .plan li{padding:10px 0; border-bottom:1px solid var(--rule); font-size:15px}
.ed .plan .btn{margin-top:auto; text-align:center}
.ed .frame-foot{text-align:center; padding:16px; border-top:1px solid var(--ink); border-bottom:1px solid var(--rule); font-family:var(--serif); font-style:italic; font-size:15px; color:var(--body)}

.ed .qa{margin-top:44px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:36px 56px}
.ed .qa h3{font-size:21px}
.ed .qa p{margin-top:10px; font-size:16px; line-height:1.7; color:var(--body)}

.ed .close{text-align:left}
.ed .close h2{font-size:clamp(40px,1.4rem + 3.4vw,80px); line-height:1.04; max-width:14ch; font-style:italic}
.ed .close .btn{margin-top:36px}
.ed .foot{display:flex; justify-content:space-between; gap:20px; padding:28px 0 40px; border-top:1px solid var(--rule); font-size:14px; color:var(--muted); max-width:1040px}
.ed .foot a{margin-left:20px; text-decoration:none}

/* Phones and narrow screens: the index folds into a slim top bar */
@media (max-width: 900px){
  .ed{grid-template-columns:1fr}
  .ed .rail{display:none}
  .ed .topbar{display:flex; align-items:center; gap:16px; position:sticky; top:0; z-index:5; padding:14px 20px; background:rgba(251,250,248,.94); backdrop-filter:blur(8px); border-bottom:1px solid var(--rule)}
  .ed .topbar .mark{margin-right:auto; font-size:19px}
  .ed .pages{padding:0 20px}
  .ed .hero-sub{grid-template-columns:1fr}
  .ed .three,.ed .plans,.ed .qa{grid-template-columns:1fr}
  .ed .three article + article{padding-left:0; border-left:0; margin-top:36px}
  .ed .plan + .plan{border-left:0; border-top:1px solid var(--ink)}
  .ed .note{margin:0 -20px; padding-left:20px; padding-right:20px}
  .ed .foot{flex-direction:column}
  .ed .foot a{margin:0 20px 0 0}
}
@media (prefers-reduced-motion: reduce){ .ed .btn{transition:none} }
`
