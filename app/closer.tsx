// Marvberry home page: "The closer behind the closer."
// Copy follows the October 21 website brief; look stays Marvberry's own: espresso, cream, Playfair,
// one clear next step per screen. Only promises what Marvberry does today.
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/500.css"
import "@fontsource/playfair-display/400-italic.css"

const START = "/signup"
const CALL = "/chat"

function Cta({ light = false }: { light?: boolean }) {
  return (
    <div className="cta">
      <a className={`btn${light ? " light" : ""}`} href={START}>
        Try Marvberry
      </a>
      <p className="fine">14 days free. We set it up with you.</p>
    </div>
  )
}

const FAQ: [string, string][] = [
  ["Do I have to be good with tech?", "No. We set it up with you, and we’re in the app if you get stuck."],
  ["Is this going to replace me?", "No. You stay the boss. Marvberry builds the offer so you can do the closing."],
  [
    "Will this get me more leads?",
    "Not first. More leads only means more clients left waiting if your deals aren’t running smoothly. Marvberry fixes that first.",
  ],
  ["Who uploads the documents?", "Your buyer does, on their own page. You don’t have to chase a thing."],
  [
    "What happens when I click “Try Marvberry”?",
    "You get 14 days free. We set it up with you, and you’re ready for your next buyer.",
  ],
  ["Can my whole office use it?", "Yes. Brokers can book a consultation, and we’ll build it around your team."],
]

export default function Closer() {
  return (
    <div className="cl">
      <style>{CSS}</style>

      <header className="nav">
        <a href="#top" className="logo" aria-label="Marvberry">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={140} height={27} />
        </a>
        <nav className="links">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">Questions</a>
          <a href="/login">Log in</a>
        </nav>
        <a className="btn sm" href={START}>
          Try Marvberry
        </a>
      </header>

      {/* Hero */}
      <section id="top" className="hero wrap">
        <div>
          <p className="eyebrow">For solo real estate agents</p>
          <h1>The closer behind the closer.</h1>
          <p className="lede">
            You find the home. Marvberry builds the offer, so you can send it in minutes and your buyer never feels left
            hanging.
          </p>
          <Cta />
        </div>
        <div className="offer-card" aria-hidden>
          <p className="oc-label">Your offer</p>
          <p className="oc-addr">24 Willow St</p>
          <p className="oc-amt">$545,000</p>
          <ol>
            <li className="done">Buyer uploads to their page</li>
            <li className="done">Marvberry builds the offer</li>
            <li className="done">You look it over</li>
            <li className="now">Sent in minutes</li>
          </ol>
        </div>
      </section>

      {/* Hook */}
      <section className="hook">
        <div className="narrow">
          <p className="big">
            Your buyer found the one. They want to make an offer tonight. And you&rsquo;re still pulling the pieces
            together by hand.
          </p>
          <p>
            Sound familiar? It&rsquo;s not you. It&rsquo;s how long an offer takes when you build it alone. Here&rsquo;s
            how to get it off your plate for good.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="wrap problem">
        <h2>You&rsquo;re not slow. Offers just take too long by hand.</h2>
        <ul className="pains">
          <li>Your buyer&rsquo;s info comes in pieces, some by text, some by email.</li>
          <li>Every offer gets put together from scratch, often late at night.</li>
          <li>While you&rsquo;re still typing, your buyer is waiting, and wondering.</li>
          <li>Then the other agent wants answers, and the lawyer and broker are waiting on each other.</li>
        </ul>
        <p className="after">
          And when anything goes wrong, even when it&rsquo;s someone else&rsquo;s mistake, it lands on you. You look slow
          in front of your buyer and the other agent. That&rsquo;s the part that keeps you up at night.
        </p>
      </section>

      {/* My story */}
      <section className="story">
        <div className="wrap story-in">
          <img src="/brand/alecia.jpg" alt="Alecia Ford, founder of Marvberry" />
          <div>
            <p className="eyebrow">My story</p>
            <h2>I&rsquo;ve sat in the assistant&rsquo;s chair.</h2>
            <p>
              I&rsquo;m Alecia. I started my first business at 9, selling candy with my lunch money. Later I managed teams
              at a big corporation, where I learned to keep every promise I made.
            </p>
            <p>
              Then I bought my own home and handled every step myself. I felt the stall firsthand, with lawyers and
              brokers waiting on each other. After that I worked as a real estate agent&rsquo;s assistant, and I saw the
              same thing on every deal. Client info came in pieces by text and email. Selling agents asked us instead of
              their own clients. And when anything went wrong, it landed on the agent.
            </p>
            <p>
              When the first agent I worked with asked me for help getting more leads, I knew more leads would only mean
              more clients left waiting. His offers had to come first. So I built something to do exactly that.
            </p>
            <p className="sign">Alecia</p>
          </div>
        </div>
      </section>

      {/* Imagine this */}
      <section className="wrap imagine">
        <p className="eyebrow">Imagine this</p>
        <div className="narrow">
          <p className="big">
            It&rsquo;s Monday morning. Your buyer calls. They found the one and want to make an offer. Before you&rsquo;ve
            finished your coffee, the offer is built and ready.
          </p>
          <p>
            You look it over, and it&rsquo;s sent in minutes. Your buyer sees it on their page right away, so they know
            exactly where the deal stands.
          </p>
          <p>
            You walk into the closing calm and on top of it. Your buyer tells their sister about you. And you&rsquo;ve
            still got time this week for your next deal, on the way to one a month.
          </p>
        </div>
      </section>

      {/* Introducing + what you get */}
      <section id="how" className="intro">
        <div className="wrap">
          <p className="eyebrow">Introducing Marvberry</p>
          <h2>The closer behind the closer.</h2>
          <p className="lede">
            The client experience program for solo real estate agents. We set it up with you. Your buyers upload their
            documents on their own page, and Marvberry builds your offers so you can send each one in minutes. You stay the
            boss.
          </p>
          <div className="gets">
            <div>
              <h3>Setup done with you</h3>
              <p>Our team sets it up with you, so there&rsquo;s nothing to figure out on your own.</p>
            </div>
            <div>
              <h3>A page for every buyer</h3>
              <p>They upload their own documents and see every home you&rsquo;re showing them.</p>
            </div>
            <div>
              <h3>Offers built by Marvberry</h3>
              <p>Your offer, built and ready to send to the listing agent in minutes.</p>
            </div>
            <div>
              <h3>Your buyer in the loop</h3>
              <p>Every showing and every offer shows up on their page, in your words.</p>
            </div>
            <div>
              <h3>Agreements from their phone</h3>
              <p>Your buyer signs in a minute. No printing, no chasing.</p>
            </div>
            <div>
              <h3>Real support</h3>
              <p>Chat with our team right inside the app.</p>
            </div>
          </div>
          <Cta />
        </div>
      </section>

      {/* What would it be worth */}
      <section className="wrap worth">
        <h2>What would it be worth to you?</h2>
        <div className="narrow">
          <p>
            You&rsquo;ve tried doing it all yourself. Typing up every offer from scratch. Staying up late to get it out.
            Hoping you didn&rsquo;t miss a detail.
          </p>
          <p>
            What would it be worth to send every offer in minutes? To never look slow in front of a buyer who might send
            you their friends? Picture going from one deal every few months to one a month. That&rsquo;s three or four
            times the commission checks.
          </p>
        </div>
      </section>

      {/* Pricing: highest first, so Agent reads as the easy yes */}
      <section id="pricing" className="pricing">
        <div className="wrap">
          <h2>Premium help. Not a premium price.</h2>
          <p className="lede">Every plan is set up with you.</p>
          <div className="tiers">
            <div className="tier">
              <p className="tname">Broker</p>
              <p className="tprice">Let&rsquo;s talk</p>
              <p className="tfor">Marvberry for every agent in your office, built around your team.</p>
              <a className="btn ghost" href={CALL}>
                Book a consultation
              </a>
            </div>
            <div className="tier">
              <p className="tname">Closer</p>
              <p className="tprice">
                $147<span>a month</span>
              </p>
              <p className="tfor">Everything in Agent, plus help that writes like you.</p>
              <ul>
                <li>Reminders to your buyers, written in your voice</li>
                <li>Reply drafts that sound like you</li>
                <li>Offer follow-ups, already written</li>
                <li>A short morning update on every deal</li>
              </ul>
              <Cta />
            </div>
            <div className="tier main">
              <p className="tname">Agent</p>
              <p className="tprice">
                $67<span>a month</span>
              </p>
              <p className="tfor">For solo agents who want every deal handled like a pro.</p>
              <ul>
                <li>Setup done with you</li>
                <li>Offers built and sent in minutes</li>
                <li>A page for every buyer, with uploads</li>
                <li>Agreements signed from their phone</li>
                <li>Your booking page</li>
                <li>Support chat in the app</li>
              </ul>
              <Cta light />
            </div>
          </div>
          <p className="founding">Founding members keep $39 a month as long as they stay.</p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="wrap fit">
        <div>
          <h3>Marvberry is not for you if&hellip;</h3>
          <ul className="no">
            <li>You already have a full-time assistant or transaction coordinator handling every file.</li>
            <li>You&rsquo;re only looking for more leads and don&rsquo;t want to change how your deals run.</li>
            <li>You want software to figure out on your own. We set it up with you.</li>
          </ul>
        </div>
        <div>
          <h3>But it&rsquo;s perfect for you if&hellip;</h3>
          <ul className="yes">
            <li>You&rsquo;re a solo agent doing it all yourself.</li>
            <li>You&rsquo;re tired of spending hours on every offer.</li>
            <li>You&rsquo;d rather be closing than doing paperwork.</li>
            <li>You want to close more deals without working more hours.</li>
            <li>You&rsquo;re not a tech person and don&rsquo;t want to be.</li>
          </ul>
        </div>
      </section>

      {/* A friendly warning */}
      <section className="warning">
        <div className="narrow">
          <p>
            You can keep doing it the way you&rsquo;ve always done it, putting every offer together by hand, being the
            go-between for the lawyer and the other agent, and taking the blame when someone else drops the ball.
          </p>
          <p className="big">
            Or you can let the next deal be the one that doesn&rsquo;t stall. Your next buyer is already deciding who
            they&rsquo;ll recommend to their friends. Will it be you?
          </p>
          <Cta light />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="wrap faq">
        <h2>Questions agents ask</h2>
        <div className="qs">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final call */}
      <section className="final">
        <h2>Your next deal doesn&rsquo;t have to stall.</h2>
        <p>
          Try Marvberry. We&rsquo;ll set it up with you, and you&rsquo;ll walk into your next deal looking like a closer,
          because you are one.
        </p>
        <Cta />
      </section>

      <footer className="foot">
        <p>
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={104} height={20} /> <em>The closer behind the closer.</em>
        </p>
        <p className="foot-links">
          <a href="/login">Log in</a>
          <a href="/chat">Support</a>
        </p>
      </footer>
    </div>
  )
}

const CSS = `
.cl{--ivory:#F6EFE5; --berry:#2A221C; --berry-dk:#000000; --ink:#2A221C; --body:#5E554C; --mute:#7A6F64; --blush:#EFE5D6; --line:#E7DED1; --accent:#8F4E2A; --gold:#C9A46C;
  --serif:'Playfair Display',Georgia,serif; --sans:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;
  background:var(--ivory); color:var(--ink); font-family:var(--sans); font-size:17px; line-height:1.6; -webkit-font-smoothing:antialiased}
.cl *{box-sizing:border-box}
.cl h1,.cl h2,.cl h3{font-family:var(--serif); font-weight:500; letter-spacing:-.01em; color:var(--berry); margin:0}
.cl h1{font-size:clamp(44px,2rem + 4vw,76px); line-height:1.03}
.cl h2{font-size:clamp(30px,1.4rem + 2vw,46px); line-height:1.12}
.cl h3{font-size:22px; line-height:1.25}
.cl p{margin:0 0 16px; color:var(--body)}
.cl a{color:inherit}
.cl .wrap{max-width:1120px; margin:0 auto; padding:0 24px}
.cl .narrow{max-width:700px; margin:0 auto}
.cl section{padding:88px 0}
.cl section.wrap{padding:88px 24px}
.cl .eyebrow{font-size:13px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:14px}
.cl .lede{font-size:20px; max-width:620px}
.cl .big{font-family:var(--serif); font-size:clamp(24px,1rem + 1.4vw,32px); line-height:1.35; color:var(--ink)}

.cl .btn{display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:0 28px; border-radius:999px; background:var(--berry); color:#fff; text-decoration:none; font-weight:600; font-size:16px; transition:background .15s}
.cl .btn:hover{background:var(--berry-dk)}
.cl .btn.sm{min-height:42px; padding:0 20px; font-size:15px}
.cl .btn.light{background:#fff; color:var(--berry)}
.cl .btn.light:hover{background:var(--blush)}
.cl .btn.ghost{background:transparent; color:var(--berry); border:1.5px solid var(--berry)}
.cl .btn.ghost:hover{background:var(--blush)}
.cl .cta{margin-top:28px}
.cl .cta .fine{margin:10px 0 0; font-size:14px; color:var(--mute)}

.cl .nav{display:flex; align-items:center; gap:28px; max-width:1120px; margin:0 auto; padding:22px 24px}
.cl .logo{margin-right:auto; display:flex}
.cl .logo img{height:27px; width:auto}
.cl .links{display:flex; gap:26px; font-size:15px}
.cl .links a{text-decoration:none; color:var(--body)}
.cl .links a:hover{color:var(--berry)}

.cl .hero{display:grid; grid-template-columns:1.25fr 1fr; gap:56px; align-items:center; padding-top:56px}
.cl .hero h1{margin-bottom:22px}
.cl .offer-card{background:#fff; border:1px solid var(--line); border-radius:22px; padding:30px; box-shadow:0 30px 60px -30px rgba(42,34,28,.25)}
.cl .oc-label{font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); margin-bottom:6px}
.cl .oc-addr{font-family:var(--serif); font-size:26px; font-weight:600; color:var(--ink); margin:0}
.cl .oc-amt{font-size:18px; margin-bottom:20px}
.cl .offer-card ol{list-style:none; margin:0; padding:0}
.cl .offer-card li{position:relative; padding:12px 0 12px 34px; border-top:1px solid var(--line); font-size:15.5px; color:var(--body)}
.cl .offer-card li::before{content:""; position:absolute; left:0; top:14px; width:20px; height:20px; border-radius:50%; border:1.5px solid var(--line)}
.cl .offer-card li.done::before{background:var(--berry); border-color:var(--berry)}
.cl .offer-card li.done::after{content:""; position:absolute; left:7px; top:18px; width:5px; height:9px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg)}
.cl .offer-card li.now{color:var(--berry); font-weight:600}
.cl .offer-card li.now::before{border-color:var(--berry); box-shadow:inset 0 0 0 5px #fff; background:var(--berry)}

.cl .hook{background:var(--blush)}
.cl .hook,.cl .warning{padding-left:24px; padding-right:24px}
.cl .problem h2{max-width:720px}
.cl .pains{list-style:none; padding:0; margin:36px 0; display:grid; grid-template-columns:1fr 1fr; gap:16px}
.cl .pains li{background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px 24px; color:var(--ink)}
.cl .after{max-width:720px; font-size:19px}

.cl .story{background:var(--berry)}
.cl .story-in{display:grid; grid-template-columns:340px 1fr; gap:56px; align-items:start}
.cl .story img{width:100%; aspect-ratio:4/5; object-fit:cover; border-radius:20px}
.cl .story h2{color:#fff}
.cl .story .eyebrow{color:var(--gold)}
.cl .story h2{margin-bottom:22px}
.cl .story p{color:rgba(255,255,255,.86)}
.cl .story .sign{font-family:var(--serif); font-style:italic; font-size:26px; color:#fff; margin-top:8px}

.cl .imagine .eyebrow{text-align:center}

.cl .intro{background:#fff; border-top:1px solid var(--line); border-bottom:1px solid var(--line)}
.cl .intro h2{margin-bottom:16px}
.cl .gets{display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:44px}
.cl .gets>div{border:1px solid var(--line); border-radius:18px; padding:26px; background:var(--ivory)}
.cl .gets h3{margin-bottom:8px; font-size:20px}
.cl .gets p{margin:0; font-size:15.5px}

.cl .worth h2{text-align:center; margin-bottom:28px}

.cl .pricing{background:var(--blush)}
.cl .pricing h2,.cl .pricing .lede{text-align:center; margin-left:auto; margin-right:auto}
.cl .pricing .lede{margin-top:12px}
.cl .tiers{display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:44px; align-items:stretch}
.cl .tier{background:#fff; border:1px solid var(--line); border-radius:22px; padding:32px 28px; display:flex; flex-direction:column}
.cl .tier.main{background:var(--berry); border-color:var(--berry)}
.cl .tier.main p,.cl .tier.main li{color:rgba(255,255,255,.88)}
.cl .tier.main .tprice{color:#fff}
.cl .tier.main .tname{color:var(--gold)}
.cl .tier.main .fine{color:rgba(255,255,255,.75)}
.cl .tname{font-size:13px; letter-spacing:.14em; text-transform:uppercase; font-weight:600; color:var(--accent); margin-bottom:8px}
.cl .tprice{font-family:var(--serif); font-size:46px; font-weight:600; line-height:1; color:var(--ink); margin-bottom:14px}
.cl .tprice span{font-family:var(--sans); font-size:15px; font-weight:400; margin-left:8px; color:inherit; opacity:.7}
.cl .tfor{font-size:15.5px}
.cl .tier ul{margin:4px 0 0; padding:0; list-style:none; flex:1}
.cl .tier li{position:relative; padding:6px 0 6px 22px; font-size:15px; color:var(--body)}
.cl .tier li::before{content:""; position:absolute; left:2px; top:15px; width:8px; height:8px; border-radius:50%; background:var(--berry)}
.cl .tier.main li::before{background:#fff}
.cl .tier .btn.ghost{margin-top:auto; align-self:flex-start}
.cl .founding{text-align:center; margin:30px 0 0; font-family:var(--serif); font-size:20px; color:var(--berry)}

.cl .fit{display:grid; grid-template-columns:1fr 1fr; gap:48px}
.cl .fit h3{margin-bottom:16px}
.cl .fit ul{list-style:none; padding:0; margin:0}
.cl .fit li{position:relative; padding:9px 0 9px 32px; border-bottom:1px solid var(--line); color:var(--ink)}
.cl .fit li::before{position:absolute; left:2px; top:8px; font-weight:600}
.cl .fit .no li::before{content:"\\2715"; color:var(--mute)}
.cl .fit .yes li::before{content:"\\2713"; color:var(--berry)}

.cl .warning{background:#3A3029}
.cl .warning p{color:rgba(255,255,255,.75)}
.cl .warning .big{color:#fff}

.cl .faq h2{text-align:center; margin-bottom:36px}
.cl .qs{max-width:760px; margin:0 auto}
.cl details{border-bottom:1px solid var(--line); padding:18px 4px}
.cl summary{cursor:pointer; list-style:none; font-family:var(--serif); font-size:21px; font-weight:600; color:var(--ink); display:flex; justify-content:space-between; gap:16px}
.cl summary::-webkit-details-marker{display:none}
.cl summary::after{content:"+"; color:var(--berry); font-family:var(--sans); font-weight:400}
.cl details[open] summary::after{content:"\\2212"}
.cl details p{margin:12px 0 0}

.cl .final{text-align:center; padding:110px 24px; background:#fff; border-top:1px solid var(--line)}
.cl .final p{max-width:560px; margin:18px auto 0; font-size:19px}
.cl .final .cta .fine{margin:10px auto 0; font-size:14px}
.cl .warning .cta .fine{color:rgba(255,255,255,.6)}

.cl .foot{display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; max-width:1120px; margin:0 auto; padding:32px 24px 44px; font-size:14px}
.cl .foot p{margin:0; display:flex; align-items:center; gap:12px}
.cl .foot img{height:20px; width:auto}
.cl .foot em{font-family:var(--serif); color:var(--berry)}
.cl .foot-links{gap:22px}
.cl .foot-links a{text-decoration:none; color:var(--body)}

@media (max-width:860px){
  .cl section{padding:64px 0}
  .cl section.wrap{padding:64px 24px}
  .cl .links{display:none}
  .cl .hero,.cl .story-in,.cl .fit{grid-template-columns:1fr}
  .cl .story-in{gap:32px}
  .cl .story img{max-width:320px}
  .cl .pains,.cl .gets,.cl .tiers{grid-template-columns:1fr}
}
`
