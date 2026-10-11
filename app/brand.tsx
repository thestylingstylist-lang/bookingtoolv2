// Marvberry home page, brand edition: warm golden light, frosted glass, plenty of air.
// Copy follows the StoryBrand order: what we do, the problem, the three jobs, the plan, the guide, the change.
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/playfair-display/500.css"
import "@fontsource/caveat/500.css"

const START = "/chat"

const PLANS = [
  {
    name: "Solo Agent",
    price: "$39",
    per: "a month",
    blurb: "Everything one realtor runs a business on.",
    items: ["Your branded booking page", "Agreements signed from a phone", "A private page for every client", "Free setup call"],
    cta: "Get started for free",
    main: true,
  },
  {
    name: "Brokerage",
    price: "From $149",
    per: "a month",
    blurb: "Your whole team, set up around how you work.",
    items: ["First five agents included", "About $30 for each agent after", "Your agreements and steps for the team", "Setup for every agent"],
    cta: "Talk to us",
  },
  {
    name: "Brand Touch",
    price: "From $1,200",
    per: "one time",
    blurb: "Your client emails, texts, and booking page, written in your voice.",
    items: ["A session on how you sound", "Every client message rewritten", "Your booking page words", "Added to any plan"],
    cta: "Ask about it",
  },
]

const FAQ = [
  ["What happens when I click \u201cGet started for free\u201d?", "You pick a time for your setup call. On the call, we build your booking page, your agreement, and your client steps with you. You leave with it working."],
  ["Do my clients have to make an account?", "No. Your clients get a private link. They book, sign, and send documents without a password or an app."],
  ["Does it work on my phone?", "Yes. Your phone or your computer, same business either way."],
  ["What if it isn\u2019t right for me?", "You have 30 days. If Marvberry isn\u2019t for you, tell us and we\u2019ll refund you in full."],
]

export default function Brand() {
  return (
    <div className="mb">
      <style>{CSS}</style>

      <header className="nav">
        <a href="#top" className="mark">
          <img src="/marvberry-mark.png" alt="" width={26} height={26} />
          <span>Marvberry</span>
        </a>
        <nav className="links">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="/login">Log in</a>
        </nav>
        <a className="btn cream sm" href={START}>
          Get started for free
        </a>
      </header>

      {/* 1. What we do */}
      <section id="top" className="hero photo">
        <div className="hero-copy">
          <p className="hand gold">for solo realtors</p>
          <h1>Ready to handle every client, paperwork, and communication, all in one place.</h1>
          <p className="sub">
            Send your branded booking link, get agreements signed, request documents, and follow up with every client.
            Built for solo realtors. And we set it up for you.
          </p>
          <div className="cta-row">
            <a className="btn cream" href={START}>
              Get started for free
            </a>
            <span className="fine">No credit card required.</span>
          </div>
        </div>
        <figure className="glass hero-glass">
          <video poster="/marvberry-demo-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-label="A short demo of Marvberry">
            <source src="/marvberry-demo.mp4" type="video/mp4" />
            <source src="/marvberry-demo.webm" type="video/webm" />
          </video>
        </figure>
      </section>

      {/* 2. The wake-up: three beats that slide over each other */}
      <div className="stack">
        <section className="beat-panel one">
          <div className="beat-inner">
            <p className="kicker">Every good realtor says real estate isn&rsquo;t transactional. It&rsquo;s relational.</p>
            <h2>So how many unread texts and emails are on your phone right now?</h2>
          </div>
        </section>
        <section className="beat-panel two">
          <div className="beat-inner">
            <h2>
              That&rsquo;s not busy.
              <br />
              <em>That&rsquo;s business without structure.</em>
            </h2>
          </div>
        </section>
        <section className="beat-panel three">
          <div className="beat-inner">
            <h2>And it&rsquo;s costing you.</h2>
            <ul className="costs">
              <li>Time with your family.</li>
              <li>Clients who would have referred you, if they&rsquo;d felt taken care of.</li>
            </ul>
          </div>
        </section>
      </div>

      {/* 3. The pivot */}
      <section className="pivot">
        <p className="hand gold">here&rsquo;s the thing</p>
        <h2>Working harder won&rsquo;t fix it. Structure will.</h2>
        <p className="lead">
          Marvberry is your assistant, without the hire. Every client lives in one place. Open one and you&rsquo;re caught
          up at a glance: what&rsquo;s done, what&rsquo;s next, what&rsquo;s waiting on you. Handle it, and you&rsquo;re
          done for the day.
        </p>
      </section>

      {/* 4. The three jobs */}
      <section id="how" className="jobs">
        <header className="jobs-head">
          <h2>Everything that takes you from booking to close.</h2>
        </header>
        <article className="job">
          <div className="job-pic wide">
            <img src="/brand/booking-glass.jpg" alt="A realtor's branded booking page, open on a warm afternoon" />
          </div>
          <div className="job-copy">
            <p className="tag">Your booking page</p>
            <h3>Show up like a brand, on your time.</h3>
            <p>
              Your own booking page, with your photo, your name, and your hours. Clients pick a time that works for you.
              You look like a full operation from the first click.
            </p>
          </div>
        </article>

        <article className="job flip">
          <div className="job-pic photo-bg">
            <div className="glass phone">
              <img src="/brand/signs.jpg" alt="A client signing their agreement on a phone" />
            </div>
          </div>
          <div className="job-copy">
            <p className="tag">Agreements and documents</p>
            <h3>Get it signed.</h3>
            <p>
              When a client says yes, your agreement is already filled in. Check the details, hit send, and they sign
              from their phone. Request their documents the same way. Everything lands under their name.
            </p>
          </div>
        </article>

        <article className="job">
          <div className="job-pic photo-bg">
            <div className="glass phone">
              <img src="/brand/portal.jpg" alt="A client's private page showing their next step" />
            </div>
          </div>
          <div className="job-copy">
            <p className="tag">Your client&rsquo;s page</p>
            <h3>Take care of your client.</h3>
            <p>
              Every client gets a private page with their next steps. No password, no app. Reminders go out for you. Your
              messages stay in one place. Your client always knows what&rsquo;s next, and you don&rsquo;t have to answer it
              twice.
            </p>
          </div>
        </article>

        <div className="mid-cta">
          <a className="btn" href={START}>
            Get started for free
          </a>
          <p className="fine dark">No credit card required.</p>
        </div>
      </section>

      {/* 4. The plan */}
      <section className="plan-band">
        <p className="hand gold">here&rsquo;s how it starts</p>
        <h2>Three steps, and we take two of them.</h2>
        <ol className="steps">
          <li>
            <span className="num">1</span>
            <p>Get started for free and pick a time for your setup call.</p>
          </li>
          <li>
            <span className="num">2</span>
            <p>We set up your booking page, your agreement, and your client steps while you watch.</p>
          </li>
          <li>
            <span className="num">3</span>
            <p>Start managing every client from your phone or your computer.</p>
          </li>
        </ol>
        <a className="btn" href={START}>
          Get started for free
        </a>
        <p className="fine dark">No credit card required.</p>
      </section>

      {/* 5. The guide */}
      <section className="founder">
        <div className="founder-pic">
          <img src="/brand/alecia.jpg" alt="Alecia Ford, founder of Marvberry" />
        </div>
        <div className="letter">
          <p className="hand gold">from Alecia</p>
          <p>
            Everyone always told me to be a realtor. I bought my own house and ran the whole deal myself. I even took the
            class. And I found out I don&rsquo;t love the selling. I love the back office, the part that makes the business
            good.
          </p>
          <p>
            I&rsquo;ve been in sales for over two decades. Multi-millions sold, and I&rsquo;ve never lost a client. Not
            because they were easy. Because I kept them in the loop. I thought ahead for them, so they never had to ask
            me for anything. And I still took my days off.
          </p>
          <p>
            Clients don&rsquo;t rate you on how many houses you sold. They rate you on how taken care of they felt.
            People forget what you did. They never forget how you made them feel. That&rsquo;s what gets you referred.
          </p>
          <p>
            Real estate is a billion-dollar industry, and every tool is about getting more leads. Nothing helps you take
            care of the clients you already have. You shouldn&rsquo;t be jumping between fifteen apps to manage one
            transaction. So I built Marvberry.
          </p>
          <p className="sign">Alecia Ford</p>
          <p className="role">Founder, Marvberry</p>
        </div>
      </section>

      {/* 7. Pricing */}
      <section id="pricing" className="pricing photo">
        <div className="glass frame">
          <header className="masthead">
            <p className="hand gold">pricing</p>
            <h2>Simple, and set up for you.</h2>
          </header>
          <div className="plans">
            {PLANS.map((p) => (
              <article key={p.name} className="tier">
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
                <a className={p.main ? "btn cream" : "btn line"} href={START}>
                  {p.cta}
                </a>
              </article>
            ))}
          </div>
          <p className="frame-foot">Every plan comes with a 30-day money-back guarantee.</p>
        </div>
      </section>

      {/* 8. Questions */}
      <section className="faq">
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

      {/* 9. Closing */}
      <section className="closing">
        <h2>Busy isn&rsquo;t success. Structure is.</h2>
        <a className="btn" href={START}>
          Get started for free
        </a>
        <p className="fine dark">No credit card required.</p>
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
    </div>
  )
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"

const CSS = `
.mb{
  --linen:#FBF9F5; --cream:#F6EFE5; --sand:#EFE6D8; --espresso:#2A221C; --ink:#2A221C; --body:#6B6158; --muted:#9A8F84;
  --gold:#C9A46C; --rasp:#CE6385; --rule:#E7DED1;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  color-scheme: light; background:var(--linen); color:var(--ink); font-family:var(--sans);
}
.mb *{box-sizing:border-box}
.mb a{color:inherit}
.mb :focus-visible{outline:2px solid var(--gold); outline-offset:3px; border-radius:4px}
.mb h1,.mb h2,.mb h3{font-family:var(--serif); font-weight:400; margin:0; letter-spacing:-.01em}
.mb p{margin:0}
.mb .hand{font-family:var(--hand); font-size:30px; line-height:1}
.mb .gold{color:var(--gold)}

.mb .btn{display:inline-block; background:var(--espresso); color:var(--cream); text-decoration:none; font-size:15.5px; font-weight:500; padding:15px 30px; border-radius:999px; border:1px solid var(--espresso); transition:background .2s, color .2s, border-color .2s}
.mb .btn:hover{background:#433730}
.mb .btn.cream{background:var(--cream); color:var(--espresso); border-color:var(--cream)}
.mb .btn.cream:hover{background:#fff}
.mb .btn.line{background:transparent; color:var(--cream); border-color:rgba(246,239,229,.55)}
.mb .btn.line:hover{border-color:var(--cream)}
.mb .btn.sm{padding:10px 18px; font-size:14px}
.mb .fine{font-size:14px; color:rgba(246,239,229,.78)}
.mb .fine.dark{color:var(--muted); margin-top:16px}

/* Warm film photo, used behind the hero and pricing */
.mb .photo{position:relative; background:#3a2d22 url(/brand/room.jpg) center/cover no-repeat; color:var(--cream); isolation:isolate}
.mb .photo::before{content:""; position:absolute; inset:0; z-index:-1; background:linear-gradient(100deg, rgba(34,26,20,.82) 0%, rgba(34,26,20,.55) 45%, rgba(34,26,20,.2) 100%)}
.mb .photo::after{content:""; position:absolute; inset:0; z-index:-1; background-image:${GRAIN}; opacity:.18; mix-blend-mode:overlay; pointer-events:none}

/* Frosted glass */
.mb .glass{background:rgba(250,244,236,.14); border:1px solid rgba(250,244,236,.32); border-radius:22px; backdrop-filter:blur(18px) saturate(1.1); -webkit-backdrop-filter:blur(18px) saturate(1.1); box-shadow:0 30px 80px -30px rgba(20,14,10,.55), inset 0 1px 0 rgba(255,255,255,.25)}

/* Nav floats over the hero */
.mb .nav{position:absolute; top:0; left:0; right:0; z-index:10; display:flex; align-items:center; gap:28px; padding:22px clamp(20px,5vw,72px); color:var(--cream)}
.mb .mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--serif); font-size:21px; margin-right:auto}
.mb .mark img{border-radius:7px}
.mb .links{display:flex; gap:28px; font-size:14.5px}
.mb .links a{text-decoration:none; opacity:.85}
.mb .links a:hover{opacity:1}

/* 1. Hero */
.mb .hero{min-height:100vh; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr); gap:clamp(32px,5vw,72px); align-items:center; padding:140px clamp(20px,5vw,72px) 96px}
.mb .hero-copy .hand{margin-bottom:18px; font-size:32px}
.mb .hero h1{font-size:clamp(38px,1.2rem + 3vw,68px); line-height:1.08; color:#FBF6EE; max-width:16ch}
.mb .hero .sub{margin-top:26px; font-size:18.5px; line-height:1.65; color:rgba(246,239,229,.86); max-width:34rem}
.mb .cta-row{margin-top:34px; display:flex; align-items:center; gap:18px 22px; flex-wrap:wrap}
.mb .hero-glass{margin:0; padding:clamp(10px,1.4vw,18px)}
.mb .hero-glass video{display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; border-radius:12px; background:#5f5853}

/* 2. Problem: lots of air */
.mb section:not(.photo){padding:clamp(96px,12vw,168px) clamp(20px,5vw,72px)}
.mb .problem{text-align:center; max-width:880px; margin:0 auto}
.mb .problem .hand{margin-bottom:16px}
.mb .problem h2{font-size:clamp(34px,1.1rem + 2.8vw,60px); line-height:1.1; font-style:italic}
.mb .lead{margin:28px auto 0; font-size:19px; line-height:1.75; color:var(--body); max-width:38rem}
.mb .lead.strong{color:var(--ink); font-family:var(--serif); font-size:22px; line-height:1.55}

/* 3. The three jobs */
.mb .jobs{display:flex; flex-direction:column; gap:clamp(96px,11vw,150px); max-width:1240px; margin:0 auto; padding-top:0 !important}
.mb .job{display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr); gap:clamp(36px,6vw,96px); align-items:center}
.mb .job.flip .job-pic{order:2}
.mb .job-pic{border-radius:24px; overflow:hidden}
.mb .job-pic.wide img{display:block; width:100%; height:auto; border-radius:24px}
.mb .job-pic.photo-bg{position:relative; background:#3a2d22 url(/brand/room.jpg) center/cover; padding:clamp(36px,5vw,64px) 0; display:flex; justify-content:center; isolation:isolate}
.mb .job-pic.photo-bg::before{content:""; position:absolute; inset:0; z-index:-1; background:rgba(34,26,20,.25)}
.mb .glass.phone{padding:10px; border-radius:30px; width:min(300px,70%)}
.mb .glass.phone img{display:block; width:100%; height:auto; border-radius:22px; max-height:470px; object-fit:cover; object-position:top}
.mb .tag{font-size:12.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); font-weight:500}
.mb .job h3{margin-top:14px; font-size:clamp(30px,1rem + 2vw,44px); line-height:1.1; font-style:italic}
.mb .job-copy > p:last-child{margin-top:20px; font-size:18px; line-height:1.75; color:var(--body)}

/* 4. Plan */
.mb .plan-band{background:var(--cream); text-align:center}
.mb .plan-band .hand{margin-bottom:14px}
.mb .plan-band h2{font-size:clamp(32px,1rem + 2.4vw,52px); line-height:1.1}
.mb .steps{list-style:none; padding:0; margin:56px auto 52px; max-width:1040px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:28px; text-align:left}
.mb .steps li{background:var(--linen); border-radius:20px; padding:30px 28px 34px}
.mb .num{display:inline-flex; width:40px; height:40px; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--gold); color:var(--gold); font-family:var(--serif); font-size:19px}
.mb .steps p{margin-top:20px; font-size:18px; line-height:1.6}

/* 5. Founder */
.mb .founder{display:grid; grid-template-columns:minmax(0,.8fr) minmax(0,1fr); gap:clamp(40px,6vw,96px); align-items:center; max-width:1160px; margin:0 auto}
.mb .founder-pic img{display:block; width:100%; height:auto; border-radius:24px; filter:sepia(.06)}
.mb .letter .hand{font-size:36px; margin-bottom:20px}
.mb .letter p:not(.hand):not(.sign):not(.role){font-family:var(--serif); font-size:19.5px; line-height:1.75; color:#4a3f36; margin-bottom:1em}
.mb .sign{font-family:var(--hand); font-size:50px; line-height:1; color:var(--ink); margin-top:10px}
.mb .role{margin-top:6px; font-size:14px; color:var(--muted)}

/* 6. What changes */
.mb .change{background:var(--cream); text-align:center}
.mb .change h2{font-size:clamp(32px,1rem + 2.4vw,52px); font-style:italic}
.mb .change ul{list-style:none; padding:0; margin:40px auto 0; max-width:640px}
.mb .change li{font-family:var(--serif); font-size:clamp(21px,.9rem + 1vw,28px); line-height:1.4; padding:18px 0; border-bottom:1px solid var(--rule)}
.mb .change li:first-child{border-top:1px solid var(--rule)}
.mb .change .lead{margin-top:34px}

/* 7. Pricing: thin frame of glass over the room */
.mb .pricing{padding:clamp(96px,12vw,160px) clamp(20px,5vw,72px)}
.mb .pricing::before{background:rgba(34,26,20,.62)}
.mb .frame{max-width:1120px; margin:0 auto; padding:10px; border-radius:10px}
.mb .masthead{text-align:center; padding:48px 24px 40px; border-bottom:1px solid rgba(246,239,229,.25)}
.mb .masthead .hand{margin-bottom:10px}
.mb .masthead h2{font-size:clamp(34px,1.2rem + 2.4vw,58px); font-style:italic; color:#FBF6EE}
.mb .plans{display:grid; grid-template-columns:repeat(3,minmax(0,1fr))}
.mb .tier{padding:38px 32px 40px; display:flex; flex-direction:column}
.mb .tier + .tier{border-left:1px solid rgba(246,239,229,.22)}
.mb .tier h3{font-size:25px; color:#FBF6EE}
.mb .tier .price{margin-top:14px; font-family:var(--serif); font-size:42px; line-height:1}
.mb .tier .price span{display:block; margin-top:8px; font-family:var(--sans); font-size:14px; color:rgba(246,239,229,.62)}
.mb .tier .blurb{margin-top:14px; font-size:15.5px; line-height:1.6; color:rgba(246,239,229,.82); min-height:3.2em}
.mb .tier ul{list-style:none; margin:22px 0 30px; padding:0; border-top:1px solid rgba(246,239,229,.22)}
.mb .tier li{padding:11px 0; border-bottom:1px solid rgba(246,239,229,.22); font-size:15px}
.mb .tier .btn{margin-top:auto; text-align:center}
.mb .frame-foot{text-align:center; padding:18px; border-top:1px solid rgba(246,239,229,.25); font-size:15px; color:rgba(246,239,229,.82)}

/* 8. Closing */
.mb .closing{text-align:center}
.mb .closing h2{font-size:clamp(38px,1.3rem + 3.4vw,78px); line-height:1.06; font-style:italic; max-width:16ch; margin:0 auto 40px}
.mb .foot{display:flex; justify-content:space-between; align-items:center; gap:20px; padding:36px clamp(20px,5vw,72px) 44px; background:var(--espresso); font-size:14px; color:rgba(246,239,229,.7)}
.mb .foot-mark{display:flex; align-items:center; gap:10px; font-family:var(--serif); font-size:17px; color:var(--cream)}
.mb .foot-mark img{border-radius:6px}
.mb .foot-mark em{color:var(--gold)}
.mb .foot a{margin-left:22px; text-decoration:none}

@media (max-width: 900px){
  .mb .links{display:none}
  .mb .hero{grid-template-columns:1fr; padding-top:110px; min-height:auto}
  .mb .job,.mb .founder{grid-template-columns:1fr}
  .mb .job.flip .job-pic{order:0}
  .mb .steps,.mb .plans{grid-template-columns:1fr}
  .mb .tier + .tier{border-left:0; border-top:1px solid rgba(246,239,229,.25)}
  .mb .founder-pic{max-width:420px}
  .mb .foot{flex-direction:column; align-items:flex-start}
  .mb .foot a{margin:0 20px 0 0}
}
@media (max-width: 480px){
  .mb .nav .btn{display:none}
}

.mb .raw{margin:34px auto 0; max-width:36rem}
.mb .raw p{font-size:20px; line-height:1.6; color:var(--body); margin-bottom:12px}
.mb .raw .beat{font-family:var(--serif); font-style:italic; font-size:30px; color:var(--ink); margin:28px 0 22px}
.mb .raw p:last-child{color:var(--ink); font-weight:500}
.mb .turn{margin:56px auto 0; max-width:38rem; padding-top:44px; border-top:1px solid var(--rule)}
.mb .turn-lead{font-family:var(--serif); font-size:clamp(26px,.9rem + 1.6vw,36px); line-height:1.25; color:var(--ink)}
.mb .turn p:not(.turn-lead){margin-top:18px; font-size:19px; line-height:1.7; color:var(--body)}

/* Wake-up stack: each beat slides up over the last */
.mb .stack{position:relative}
.mb .beat-panel{position:sticky; top:0; min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:96px clamp(20px,5vw,72px) !important}
.mb .beat-panel.one{background:var(--linen)}
.mb .beat-panel.two{background:var(--cream); border-radius:28px 28px 0 0; box-shadow:0 -24px 60px -30px rgba(42,34,28,.35)}
.mb .beat-panel.three{background:var(--espresso); color:var(--cream); border-radius:28px 28px 0 0; box-shadow:0 -24px 60px -30px rgba(42,34,28,.5)}
.mb .beat-inner{max-width:900px}
.mb .kicker{font-family:var(--hand); font-size:clamp(26px,.8rem + 1.6vw,36px); color:var(--gold); line-height:1.25; margin-bottom:26px}
.mb .beat-panel h2{font-size:clamp(36px,1.1rem + 3.4vw,76px); line-height:1.08}
.mb .beat-panel.two em{color:#B08A4E}
.mb .beat-panel.three h2{color:#FBF6EE; font-style:italic}
.mb .costs{list-style:none; padding:0; margin:44px auto 0; max-width:640px}
.mb .costs li{font-family:var(--serif); font-size:clamp(21px,.9rem + 1vw,28px); line-height:1.45; padding:18px 0; border-top:1px solid rgba(246,239,229,.22); color:rgba(246,239,229,.9)}
.mb .pivot{text-align:center; max-width:880px; margin:0 auto}
.mb .pivot .hand{margin-bottom:16px}
.mb .pivot h2{font-size:clamp(34px,1.1rem + 2.8vw,62px); line-height:1.1}
.mb .jobs-head{text-align:center}
.mb .jobs-head h2{font-size:clamp(32px,1rem + 2.4vw,54px); line-height:1.1; max-width:20ch; margin:0 auto}
.mb .mid-cta{text-align:center}
.mb .faq{max-width:1040px; margin:0 auto}
.mb .faq h2{font-size:clamp(32px,1rem + 2.4vw,52px); font-style:italic; text-align:center}
.mb .qa{margin-top:48px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:40px 56px}
.mb .qa > div{padding-top:22px; border-top:1px solid var(--rule)}
.mb .qa h3{font-size:21px; line-height:1.3}
.mb .qa p{margin-top:10px; font-size:16.5px; line-height:1.7; color:var(--body)}
.mb .closing{background:var(--cream)}
@media (max-width: 900px){ .mb .qa{grid-template-columns:1fr} }
@media (prefers-reduced-motion: reduce){ .mb .btn{transition:none} }
`
