// Marvberry home page, brand edition: warm golden light, frosted glass, plenty of air.
// Copy follows the StoryBrand order: what we do, the problem, the three jobs, the plan, the guide, the change.
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/playfair-display/500.css"
import "@fontsource/playfair-display/500-italic.css"
import "@fontsource/caveat/500.css"
import BrandMotion from "./brand-motion"

const START = "/signup"
const CALL = "/chat"

const HIRES = [
  { job: "Your bookings", role: "A front desk receptionist", cost: "About $39,000 a year" },
  { job: "Your deals", role: "A transaction coordinator", cost: "$250 to $600 a file", note: "or $40,000 to $65,000 a year full time" },
  { job: "Your relationships", role: "A part-time client assistant", cost: "About $1,000 a month" },
]

const FAQ = [
  ["What happens when I click \u201cTry Marvberry\u201d?", "You create your free account. No credit card. If you\u2019d rather have it done for you, book a free setup call and we\u2019ll build your booking page, your agreement, and your client steps with you."],
  ["Do my clients have to make an account?", "No. Your clients get a private link. They book, sign, and send documents without a password or an app."],
  ["Does it work on my phone?", "Yes. Your phone or your computer, same business either way."],
  ["What if it isn\u2019t right for me?", "You have 30 days. If Marvberry isn\u2019t for you, tell us and we\u2019ll refund you in full."],
]

export default function Brand() {
  return (
    <div className="mb">
      <style>{CSS}</style>
      <BrandMotion />

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
        <a className="btn sm" href={START}>
          Try Marvberry
        </a>
      </header>

      {/* 1. What we do */}
      <section id="top" className="hero light">
        <p className="eyebrow">for Real Estate Agents</p>
        <h1>
          <span className="l1">Run your Business like</span>
          <span className="l2">You&rsquo;ve got a team!</span>
        </h1>
        <p className="sub">
          Your bookings, handled. Your agreements, signed. Every client knowing what&rsquo;s next, without texting you to
          ask.
        </p>
        <p className="identity">
          Be the agent who looks completely buttoned-up. <em>And still has a life.</em>
        </p>
        <a className="btn rust" href={START}>
          Try Marvberry
        </a>
        <svg className="swoosh" viewBox="0 0 100 12" aria-hidden="true">
          <path d="M2 4 C 35 0, 70 2, 98 10" />
        </svg>
        <p className="fine dark">Free to start. No credit card.</p>
      </section>

      {/* Real screens rise over the pinned hero as you scroll */}
      <div className="float-row">
        <img
          className="lounge"
          src="/brand/lounge.webp"
          alt="A realtor relaxing on her couch while a client books a time on her Marvberry booking page"
        />
      </div>

      {/* Q2. What can it actually do? */}
      <section id="how" className="jobs">
        <header className="jobs-head">
          <h2>So here&rsquo;s what it does.</h2>
        </header>
        <article className="job">
          <div className="job-pic wide">
            <img src="/brand/booking-glass.jpg" alt="A realtor's branded booking page, open on a warm afternoon" />
          </div>
          <div className="job-copy">
            <p className="tag">Your bookings</p>
            <h3>This is what having it together looks like.</h3>
            <p>
              One link with your name, your face, and your hours. Clients book themselves into the times you set, and
              everyone gets a confirmation and a reminder. From the first click, you look like you&rsquo;ve got a front
              desk.
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
            <p className="tag">Your deals</p>
            <h3>They say yes. The deal is handled.</h3>
            <p>
              Your agreement is already filled in with your terms. One click, and they sign from their phone. Ask for
              documents, and they upload them from their page. Every file lands under their name.
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
            <p className="tag">Your relationships</p>
            <h3>Your clients always know what&rsquo;s next.</h3>
            <p>
              Every client gets a private page with their next step and what&rsquo;s due. No app. No password. They check
              it instead of texting you.
            </p>
          </div>
        </article>
      </section>

      {/* Q3. What makes this different? Beat 1: you're not setting it up */}
      <section className="plan-band">
        <p className="hand gold">here&rsquo;s the difference</p>
        <h2>And no, you&rsquo;re not setting this up yourself.</h2>
        <p className="lead">
          We set it up for you. Your booking page, your agreements, your client steps, all built with you on one free
          call. You don&rsquo;t learn a system. You just show up and it&rsquo;s ready.
        </p>
        <a className="btn" href={START}>
          Try Marvberry
        </a>
        <p className="fine dark">Free to start. No credit card.</p>
      </section>

      {/* Q3, beat 2: meet Marvberry, the assistant */}
      <section className="pivot meet">
        <p className="hand gold">meet marvberry</p>
        <h2>Your assistant. It sounds like you.</h2>
        <p className="lead">
          Marvberry learns how you write. When a client messages you, a reply is waiting in your words. You read it,
          approve it, send it. Reminders are ready before anything is late. And every morning, it tells you what changed
          and what matters today.
        </p>
        <p className="lead strong">Your clients only ever see your name.</p>
        <p className="trio">
          <span>Your bookings.</span>
          <span>Your deals.</span>
          <span>Your relationships.</span>
        </p>
      </section>

      {/* Q5. What's this going to cost me? The value stack */}
      <section id="pricing" className="value">
        <header className="value-head">
          <p className="hand gold">the math</p>
          <h2>So what would it cost to hire this team?</h2>
        </header>
        <div className="hires">
          {HIRES.map((h) => (
            <div key={h.role} className="hire">
              <p className="tag">{h.job}</p>
              <h3>{h.role}</h3>
              <p className="cost">{h.cost}</p>
              {h.note && <p className="note">{h.note}</p>}
            </div>
          ))}
        </div>
        <div className="total">
          <p className="sum">
            That&rsquo;s over <strong>$5,000 a month.</strong>
          </p>
          <p className="hidden-cost">Before you&rsquo;ve hired, trained, or covered a single sick day.</p>
        </div>
        <div className="reveal">
          <p className="does">Marvberry does all three jobs for</p>
          <p className="price-big">
            $39<span>a month</span>
          </p>
          <p className="daily">About $1.30 a day. Early price, and you keep it as the price goes up.</p>
          <a className="btn" href={START}>
            Try Marvberry
          </a>
          <p className="fine dark">Free to start. No credit card. 30-day money-back guarantee.</p>
          <p className="brokerage">
            Running a brokerage? <a href={CALL}>Talk to us</a>.
          </p>
        </div>
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
          <div className="letter-cta">
            <a className="btn" href={CALL}>
              Let me set it up for you
            </a>
            <p className="fine dark">A free call. I&rsquo;ll build it with you.</p>
          </div>
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
          Try Marvberry
        </a>
        <p className="fine dark">Free to start. No credit card.</p>
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
  --linen:#FFFFFF; --cream:#F6EFE5; --sand:#EFE6D8; --espresso:#2A221C; --ink:#2A221C; --body:#6B6158; --muted:#9A8F84;
  --gold:#C9A46C; --rust:#8F4E2A; --sun:#FFBD59; --rasp:#CE6385; --rule:#E7DED1;
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
.mb .nav{position:absolute; top:0; left:0; right:0; z-index:10; display:flex; align-items:center; gap:28px; padding:22px clamp(20px,5vw,72px); color:var(--ink)}
.mb .mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--serif); font-size:21px; margin-right:auto}
.mb .mark img{border-radius:7px}
.mb .links{display:flex; gap:28px; font-size:14.5px}
.mb .links a{text-decoration:none; opacity:.85}
.mb .links a:hover{opacity:1}

/* 1. Hero */
.mb .hero.light{min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; background:var(--linen); padding:140px clamp(20px,5vw,72px) 96px}
.mb .hero .eyebrow{font-family:var(--serif); font-size:clamp(17px,.9rem + .4vw,22px); color:var(--rust); align-self:center; width:min(100%,62rem); text-align:left; padding-left:clamp(0px,3vw,48px)}
.mb .hero h1{font-style:italic; line-height:1.02; margin-top:6px}
.mb .hero h1 .l1{display:block; font-size:clamp(30px,.5rem + 5.6vw,96px); color:var(--ink)}
.mb .hero h1 .l2{display:block; font-size:clamp(40px,.5rem + 7.6vw,124px); color:var(--sun); font-weight:500}
.mb .hero .sub{margin-top:28px; font-size:clamp(18px,.9rem + .7vw,26px); line-height:1.5; color:var(--ink); max-width:46rem}
.mb .btn.rust{margin-top:44px; background:transparent; color:var(--rust); border:2px solid var(--sun); border-radius:12px; font-family:var(--serif); font-size:clamp(20px,1rem + .6vw,26px); padding:8px 56px}
.mb .btn.rust:hover{background:var(--rust); color:#FFFFFF}
.mb .swoosh{width:96px; height:12px; margin-top:8px; fill:none; stroke:var(--rust); stroke-width:1.6; stroke-linecap:round}
.mb .hero .fine.dark{margin-top:14px; color:var(--ink)}
/* Scroll: the hero stays pinned while screens rise over it, then each section slides up over the last */
.mb .hero.light{position:sticky; top:0; z-index:0}
:where(.mb > section:not(.hero), .mb > .stack, .mb > footer){position:relative; z-index:1; background-color:var(--linen)}
.mb .stack{z-index:1}
/* Narrow sections paint their background edge to edge so the pinned hero never shows at the sides */
.mb .pivot,.mb .jobs,.mb .founder,.mb .faq{box-shadow:0 0 0 100vmax var(--linen); clip-path:inset(0 -100vmax)}
.mb .float-row{position:relative; z-index:1; pointer-events:none; overflow-x:clip}
.mb .lounge{display:block; width:100%; height:auto}
.mb .rv{opacity:.12; transform:translateY(26px); transition:opacity .9s ease, transform .9s cubic-bezier(.2,.7,.2,1)}
.mb .job-pic.rv{transform:translateX(48px)}
.mb .job.flip .job-pic.rv{transform:translateX(-48px)}
.mb .rv.in{opacity:1; transform:none}
@media (max-width: 900px){
  .mb .lounge{width:140vw; max-width:none; margin-left:-20vw}
}
}
@media (prefers-reduced-motion: reduce){
  .mb .hero.light{position:relative}
}

/* Hero entrance: each piece rises in, line two lands last, then the swoosh draws itself */
@keyframes mbRise{from{opacity:0; transform:translateY(18px)} to{opacity:1; transform:none}}
@keyframes mbLand{from{opacity:0; transform:translateY(28px) scale(.96)} to{opacity:1; transform:none}}
@keyframes mbDraw{to{stroke-dashoffset:0}}
.mb .hero .eyebrow,.mb .hero h1 .l1,.mb .hero .sub,.mb .hero .btn.rust,.mb .hero .fine.dark{opacity:0; animation:mbRise .8s cubic-bezier(.2,.7,.2,1) forwards}
.mb .hero .eyebrow{animation-delay:.1s}
.mb .hero h1 .l1{animation-delay:.3s}
.mb .hero h1 .l2{opacity:0; transform-origin:50% 70%; animation:mbLand 1s cubic-bezier(.2,.8,.2,1) .65s forwards}
.mb .hero .sub{animation-delay:1.2s}
.mb .hero .btn.rust{animation-delay:1.45s}
.mb .swoosh path{stroke-dasharray:110; stroke-dashoffset:110; animation:mbDraw .7s ease-out 1.9s forwards}
.mb .hero .fine.dark{animation-delay:2.1s}
@media (prefers-reduced-motion: reduce){
  .mb .hero .eyebrow,.mb .hero h1 .l1,.mb .hero h1 .l2,.mb .hero .sub,.mb .hero .btn.rust,.mb .hero .fine.dark{opacity:1; animation:none; transform:none}
  .mb .swoosh path{stroke-dashoffset:0; animation:none}
}

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
.mb .founder{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:clamp(40px,6vw,88px); align-items:stretch; max-width:1240px; margin:0 auto}
.mb .founder-pic{position:relative; min-height:640px}
.mb .founder-pic img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 30%; border-radius:24px; filter:sepia(.06)}
.mb .letter{align-self:center}
.mb .letter-cta{margin-top:30px}
.mb .letter-cta .fine{margin-top:12px}
.mb .letter .hand{font-size:36px; margin-bottom:20px}
.mb .letter p:not(.hand):not(.sign):not(.role):not(.fine){font-family:var(--serif); font-size:19.5px; line-height:1.75; color:#4a3f36; margin-bottom:1em}
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
  .mb .hero.light{padding-top:110px; min-height:100svh}
  .mb .hero .eyebrow{text-align:center; padding-left:0}
  .mb .job,.mb .founder{grid-template-columns:1fr}
  .mb .job.flip .job-pic{order:0}
  .mb .steps,.mb .plans{grid-template-columns:1fr}
  .mb .tier + .tier{border-left:0; border-top:1px solid rgba(246,239,229,.25)}
  .mb .founder-pic{min-height:0; aspect-ratio:4/5}
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
.mb .team-line{font-family:var(--serif); font-size:22px; line-height:1.5; color:var(--ink); max-width:34rem; margin:0 auto 28px}
.mb .faq{max-width:1040px; margin:0 auto}
.mb .faq h2{font-size:clamp(32px,1rem + 2.4vw,52px); font-style:italic; text-align:center}
.mb .qa{margin-top:48px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:40px 56px}
.mb .qa > div{padding-top:22px; border-top:1px solid var(--rule)}
.mb .qa h3{font-size:21px; line-height:1.3}
.mb .qa p{margin-top:10px; font-size:16.5px; line-height:1.7; color:var(--body)}
.mb .closing{background:var(--cream)}
@media (max-width: 900px){ .mb .qa{grid-template-columns:1fr} }
@media (prefers-reduced-motion: reduce){ .mb .btn{transition:none} }
/* Elevated script */
.mb .hero .identity{margin-top:22px; font-family:var(--serif); font-size:clamp(19px,.9rem + .6vw,24px); line-height:1.4; color:var(--rust); max-width:40rem}
.mb .hero .identity em{font-style:italic; white-space:nowrap}
.mb .hero .identity{opacity:0; animation:mbRise .8s cubic-bezier(.2,.7,.2,1) 1.35s forwards}
@media (prefers-reduced-motion: reduce){ .mb .hero .identity{opacity:1; animation:none; transform:none} }
.mb .plan-band h2{max-width:22ch; margin:0 auto}
.mb .plan-band h2 em{font-style:italic; color:var(--rust)}
.mb .plan-band .lead.guarantee{font-size:16.5px; color:var(--muted); margin-bottom:36px}
.mb .meet h2{font-size:clamp(44px,1.4rem + 4vw,96px); font-style:italic}
.mb .trio{margin:44px 0 0; display:flex; justify-content:center; gap:clamp(14px,3vw,40px); flex-wrap:wrap; font-family:var(--serif); font-size:clamp(22px,1rem + 1vw,32px); color:var(--ink)}
.mb .trio span:nth-child(2){color:var(--rust)}
.mb .jobs .jobs-head{padding-top:56px}
.mb .meet{padding-bottom:24px !important}
.mb .meet .team-line{margin-top:36px; font-style:italic; color:var(--muted)}
.mb .value{text-align:center; box-shadow:0 0 0 100vmax var(--linen); clip-path:inset(0 -100vmax)}
.mb .value-head h2{font-size:clamp(32px,1rem + 2.4vw,54px); line-height:1.1; max-width:18ch; margin:14px auto 0}
.mb .hires{max-width:1040px; margin:56px auto 0; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; text-align:left}
.mb .hire{border:1px solid var(--rule); border-radius:20px; padding:28px 26px 30px; background:var(--linen)}
.mb .hire h3{margin-top:12px; font-family:var(--serif); font-size:24px; font-weight:400; line-height:1.25; color:var(--ink)}
.mb .hire .cost{margin-top:18px; font-size:20px; font-weight:600; color:var(--ink); text-decoration:line-through; text-decoration-color:rgba(143,78,42,.55); text-decoration-thickness:2px}
.mb .hire .note{margin-top:6px; font-size:14.5px; color:var(--muted)}
.mb .total{margin:48px auto 0; max-width:40rem}
.mb .total .sum{font-family:var(--serif); font-size:clamp(26px,1rem + 1.6vw,40px); color:var(--ink)}
.mb .total .hidden-cost{margin-top:10px; font-size:17px; color:var(--body)}
.mb .reveal{margin:64px auto 0; max-width:640px; background:var(--cream); border-radius:28px; padding:48px 28px 44px}
.mb .reveal .does{font-family:var(--serif); font-style:italic; font-size:24px; color:var(--ink)}
.mb .reveal .price-big{font-family:var(--serif); font-size:clamp(80px,3rem + 6vw,140px); line-height:1; color:var(--rust); margin:10px 0 6px}
.mb .reveal .price-big span{font-size:22px; color:var(--body); margin-left:10px; font-style:italic}
.mb .reveal .daily{font-size:17px; color:var(--body); margin-bottom:30px}
.mb .reveal .brokerage{margin-top:22px; font-size:15px; color:var(--muted)}
.mb .reveal .brokerage a{color:var(--rust)}
@media (max-width: 900px){ .mb .hires{grid-template-columns:1fr} .mb .trio{flex-direction:column; gap:6px} }
`