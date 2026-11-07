"use client"
// Marvberry home page. Light and airy, one idea per section, the assistant shown doing real work.
// Every task shown here is something Marvberry does today. Copy locked with Alecia, Nov 7 2026.
import { useEffect, useRef, useState } from "react"

const START = "/signup"
const CALL = "/chat"
const BERRY = "/brand/berry-clear.webp"
const TRIAL = "Start your 14-day free trial"

const LINES = ["prepares your agreements", "organizes your follow-ups", "keeps your clients updated", "gets your offers moving"]

function Icon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    doc: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>),
    bell: (<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>),
    lock: (<><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>),
    shield: (<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m8.8 12.2 2.2 2.2 4.3-4.4" /></>),
    folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    down: <path d="M12 5v14M6 13l6 6 6-6" />,
    up: <path d="M12 19V5M6 11l6-6 6 6" />,
    pen: <path d="M14.5 4.5l5 5L11 18l-5 .5.5-5z" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden>{p[name]}</svg>
}

// "Marvberry … prepares your agreements", the end of the line rotates.
function Rotator() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 2800)
    return () => clearInterval(t)
  }, [])
  return (
    <p className="rot" aria-live="polite">
      <span className="rot-who">Marvberry<img className="inberry" src={BERRY} alt="" /></span>
      <span key={i} className="grad rot-line">{LINES[i]}</span>
    </p>
  )
}

// The motion card: the promise, the ask, the result. Then it loops.
function Motion() {
  const [beat, setBeat] = useState(0)
  const [loop, setLoop] = useState(0)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lengths = [3800, 5200, 3800]
    let t: ReturnType<typeof setTimeout>
    const step = (b: number) => {
      t = setTimeout(() => {
        const next = (b + 1) % 3
        if (next === 0) setLoop((x) => x + 1)
        setBeat(next)
        step(next)
      }, lengths[b])
    }
    step(0)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="motion" aria-label="You handle the relationships. Marvberry handles the busywork.">
      {beat === 0 && (
        <div key={`p${loop}`} className="beat promise">
          <p className="ai">You handle the relationships.</p>
          <p className="what grad">Marvberry handles the busywork.</p>
        </div>
      )}
      {beat === 1 && (
        <div key={`c${loop}`} className="beat chat">
          <div className="who">
            <img src={BERRY} alt="" />
            <span>Marvberry</span>
          </div>
          <p className="bub me b1">Marvberry, prepare Sandra’s buyer agreement.</p>
          <p className="bub b2">I’ve prepared Sandra’s agreement. It’s ready for your review.</p>
          <p className="bub me b3">Looks good. Send it.</p>
        </div>
      )}
      {beat === 2 && (
        <div key={`d${loop}`} className="beat done">
          <div className="signed">
            <span className="sig-ic"><Icon name="pen" /></span>
            <div>
              <p className="k">Buyer agreement · Sandra Lewis</p>
              <p className="v">Signed · Tue, Nov 10 · 2:15 PM</p>
            </div>
            <span className="ok"><Icon name="check" /></span>
          </div>
          <p className="dots"><i /><i /><i /></p>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.2 },
    )
    root.current?.querySelectorAll(".rv").forEach((el) => io.observe(el))
    return () => {
      window.removeEventListener("scroll", onScroll)
      io.disconnect()
    }
  }, [])

  return (
    <div className="hv" ref={root}>
      <style>{CSS}</style>

      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <a href="#top">
          <img className="logo" src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} />
        </a>
        <nav>
          <a href="#how" className="hide-sm">How it works</a>
          <a href="#start" className="hide-sm">Pricing</a>
          <a href="/login" className="hide-sm">Log in</a>
          <a className="btn sm" href={START}>Try Marvberry</a>
        </nav>
      </header>

      {/* 1. Hero */}
      <div className="hero-wrap" id="top">
        <section className="first">
          <p className="chip"><span className="dot" />For real estate agents</p>
          <h1>Get more done without doing it all yourself.</h1>
          <Rotator />
          <p className="lede">
            Meet Marvberry, your AI-powered real estate assistant. From preparing agreements to organizing follow-ups
            and next steps, Marvberry helps take care of the work around your deals so you can focus on your clients.
          </p>
          <div className="ctas">
            <a className="btn" href={START}>{TRIAL}</a>
            <p className="fine">No credit card required.</p>
          </div>
          <button
            type="button"
            className="more"
            onClick={() => document.getElementById("busywork")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Learn more
            <Icon name="down" />
          </button>
        </section>
      </div>

      {/* 2. The busywork */}
      <section className="sec center" id="busywork">
        <div className="rv">
          <h2>The busywork between booking and closing? Hand it over.</h2>
          <p className="sub">
            Tell Marvberry what needs to happen, and your AI assistant gets to work. From turning bookings into clients
            and preparing agreements to organizing showings, offers, and follow-ups, Marvberry helps handle the
            busywork so you can focus on the people who matter most.
          </p>
        </div>
        <div className="stage rv">
          <Motion />
        </div>
      </section>

      {/* 3. How it works */}
      <section className="sec split" id="how">
        <div className="copy rv">
          <h2>Tell Marvberry what you need. It gets to work.</h2>
          <p className="sub">
            Ask Marvberry to prepare an agreement, organize a follow-up, or help with the next step in a deal. Your
            assistant takes care of the preparation and brings important documents back to you for review.
          </p>
        </div>
        <div className="visual rv">
          <div className="phone">
            <div className="ph-head">
              <img src={BERRY} alt="" />
              <p className="nm">Marvberry</p>
              <p className="st">Preparing an agreement…</p>
            </div>
            <div className="ph-body">
              <p className="bub me d1">Marvberry, prepare Sandra’s buyer agreement.</p>
              <p className="bub d2">I’ve prepared Sandra’s agreement. It’s ready for your review.</p>
              <div className="file d3">
                <span className="pdf">PDF</span>
                <div>
                  <p className="fk">Buyer agreement</p>
                  <p className="fv">Sandra Lewis · Ready for review</p>
                </div>
              </div>
              <p className="dots d4"><i /><i /><i /></p>
            </div>
            <div className="ph-input">
              <span>Ask Marvberry</span>
              <span className="send"><Icon name="up" /></span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Stay in control */}
      <section className="sec split flip">
        <div className="copy rv">
          <h2>Stay in control.</h2>
          <p className="sub strong">Review and approve documents before they’re sent.</p>
          <p className="sub">
            Marvberry prepares agreements and offers for you to review. Check the details, make changes if needed, and
            approve the documents before they’re sent on your behalf.
          </p>
        </div>
        <div className="visual rv">
          <div className="phone">
            <div className="ph-head">
              <img src={BERRY} alt="" />
              <p className="nm">Marvberry</p>
              <p className="st">Waiting for your approval</p>
            </div>
            <div className="ph-body">
              <div className="ask d1">
                <p className="ask-k"><Icon name="doc" />Offer · 18 Elm Road</p>
                <div className="ask-v">
                  <p className="kv"><span>Buyer</span>Priya Shah</p>
                  <p className="kv"><span>Offer price</span>$545,000</p>
                  <p className="kv"><span>Closing</span>Dec 19</p>
                  <p className="kv"><span>Send to</span>Listing agent</p>
                </div>
                <span className="b-send">Approve and send</span>
                <span className="b-edit">Make changes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Security */}
      <section className="sec split">
        <div className="copy rv">
          <h2>Your clients’ information deserves protection.</h2>
          <p className="sub">
            Contracts, agreements, and uploads are encrypted in transit and at rest. Private links help control access,
            and signed documents stay organized under each client’s record.
          </p>
        </div>
        <div className="visual rv">
          <div className="vault">
            <span className="v-ic"><Icon name="shield" /></span>
            <p className="v-t">Sandra Lewis</p>
            <p className="v-row"><Icon name="lock" />Encrypted in transit and at rest</p>
            <p className="v-row"><Icon name="lock" />Private links, only for Sandra</p>
            <p className="v-row"><Icon name="folder" />Signed documents, all in one place</p>
          </div>
        </div>
      </section>

      {/* 6. Client experience */}
      <section className="sec split flip">
        <div className="copy rv">
          <h2>Give every client a clear view of what’s next.</h2>
          <p className="sub">
            Give clients their own page to see what needs attention and what comes next, without another account to
            manage. Marvberry helps keep them informed while you stay focused on serving them.
          </p>
        </div>
        <div className="visual rv">
          <div className="shot">
            <img src="/brand/portal-full.jpg" alt="A client’s page showing their next step" />
          </div>
        </div>
      </section>

      {/* 7. Setup */}
      <section className="sec center setup">
        <div className="rv">
          <img className="setup-berry" src={BERRY} alt="" />
          <h2>We’ll take care of the setup, too.</h2>
          <p className="sub">
            Tell us a little about your business, and we’ll personalize Marvberry for you. From your booking page to
            your essential templates, our team handles the setup so you can keep doing what you do best.
          </p>
          <p className="pill-note">Complimentary personalized setup included with every plan.</p>
        </div>
      </section>

      {/* 8. Final call to action */}
      <section className="final rv" id="start">
        <h2>Ready to get more done with Marvberry?</h2>
        <p className="sub">Your AI-powered real estate assistant, with real people here to help you get started.</p>
        <div className="final-ctas">
          <a className="btn" href={START}>{TRIAL}</a>
          <p className="fine">$67/month after your trial. No credit card required to start.</p>
          <p className="broker">Running a brokerage? <a href={CALL}>Book a consultation</a>.</p>
        </div>
      </section>

      <footer className="foot">
        <p className="fmark">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={104} height={20} />
          <span>The AI assistant built for real estate agents</span>
        </p>
        <nav>
          <a href="/login">Log in</a>
          <a href="/support">Support</a>
          <a href="/partners">Partners</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </div>
  )
}

const CSS = `
.hv{
  --ink:#16151a; --soft:#5f5d66; --muted:#8d8b92; --line:rgba(22,21,26,.08); --berry:#BC559E; --tint:#FBEDF5; --gray:#EEEEF1;
  color-scheme:light; background:#F8F8F8; color:var(--ink); min-height:100vh; overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;
}
.hv *{box-sizing:border-box}
.hv h1,.hv h2,.hv p,.hv ul{margin:0;padding:0}
.hv img{display:block;max-width:100%;height:auto}
.hv a{color:inherit;text-decoration:none}
.hv :focus-visible{outline:2px solid var(--berry);outline-offset:3px;border-radius:8px}
.hv h1,.hv h2{text-wrap:balance}
.hv svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}

.hv .nav{position:sticky;top:0;z-index:50;display:flex;justify-content:space-between;align-items:center;padding:16px clamp(16px,5vw,64px);transition:background .3s,box-shadow .3s}
.hv .nav.scrolled{background:rgba(248,248,248,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 1px 0 var(--line)}
.hv .nav .logo{height:24px;width:auto}
.hv .nav nav{display:flex;gap:28px;align-items:center;font-size:15px;color:var(--soft)}
.hv .nav nav a:hover{color:var(--ink)}
.hv .btn{display:inline-flex;align-items:center;gap:8px;justify-content:center;background:var(--ink);color:#fff;border-radius:999px;padding:15px 28px;font-weight:550;font-size:16px;box-shadow:0 8px 20px -8px rgba(22,21,26,.5);transition:transform .2s}
.hv .nav nav a.btn{color:#fff}
.hv .btn:hover{transform:translateY(-1px)}
.hv .btn.sm{padding:10px 18px;font-size:14px}
.hv .btn.soft{background:var(--gray);color:var(--ink);box-shadow:none}

.hv .hero-wrap{background:radial-gradient(60% 50% at 50% 0%,#fff1f6 0%,#F8F8F8 70%);margin-top:-72px;padding-top:72px}
.hv .first{position:relative;min-height:calc(100svh - 72px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 16px 96px}
.hv .chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:14px;font-weight:500}
.hv .chip .dot{width:7px;height:7px;border-radius:50%;background:var(--berry)}
.hv h1{font-weight:650;letter-spacing:-.045em}
.hv h1{max-width:15ch;margin:22px auto 0;font-size:clamp(42px,1rem + 4.6vw,80px);line-height:1.02}
.hv .inberry{display:inline-block;width:1.5em;height:1.5em;margin:-.3em 0 -.3em .1em;object-fit:contain;animation:hvFloat 5s ease-in-out infinite}
.hv .rot{margin-top:20px;min-height:1.3em;font-size:clamp(22px,.9rem + 1.6vw,34px);font-weight:500;letter-spacing:-.025em;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:0 .3em}
.hv .rot-who{display:inline-flex;align-items:center;color:var(--ink)}
.hv .lede{max-width:600px;margin:22px auto 0;font-size:clamp(16px,.9rem + .3vw,19px);line-height:1.55;color:var(--soft)}
.hv .ctas .fine{margin-top:12px}
.hv .rot-line{display:inline-block;padding-bottom:.08em;animation:hvRot .6s cubic-bezier(.2,.9,.3,1) both}
.hv .grad{background:linear-gradient(100deg,#BC559E,#E8857A 55%,#9C7CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.hv .ctas{margin-top:30px;display:flex;flex-direction:column;align-items:center}
.hv .more{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:14.5px;font-weight:500;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:999px;padding:10px 18px;cursor:pointer;box-shadow:0 10px 30px -18px rgba(22,21,26,.35)}
.hv .more svg{width:16px;height:16px;animation:hvNudge 2.4s ease-in-out infinite}

.hv .sec{max-width:1160px;margin:0 auto;padding:clamp(90px,12vw,150px) clamp(16px,4vw,32px) 0}
.hv h2{font-size:clamp(32px,1rem + 2.6vw,52px);font-weight:600;letter-spacing:-.035em;line-height:1.06}
.hv .sub{margin-top:18px;font-size:clamp(17px,.9rem + .35vw,20px);line-height:1.55;color:var(--soft)}
.hv .center{text-align:center}
.hv .center .sub{max-width:640px;margin-left:auto;margin-right:auto}

.hv .stage{margin-top:48px}
.hv .motion{position:relative;height:clamp(380px,46vw,560px);border-radius:32px;overflow:hidden;background:radial-gradient(70% 60% at 85% 100%,#efe6ff 0%,transparent 70%),radial-gradient(60% 55% at 10% 100%,#ffe6f1 0%,transparent 70%),#fff;box-shadow:0 1px 0 var(--line),0 40px 90px -60px rgba(22,21,26,.35);display:grid;place-items:center;padding:24px}
.hv .beat{width:min(560px,100%);animation:hvBeat .7s cubic-bezier(.2,.9,.3,1) both}
.hv .promise{text-align:center}
.hv .ai{font-size:clamp(34px,1rem + 3.4vw,64px);font-weight:650;letter-spacing:-.04em;line-height:1.05}
.hv .what{margin-top:12px;font-size:clamp(34px,1rem + 3.4vw,64px);font-weight:650;letter-spacing:-.04em;line-height:1.05;animation:hvRot .8s .5s cubic-bezier(.2,.9,.3,1) both}
.hv .tile{width:1.5em;height:1.5em;border-radius:.4em;display:grid;place-items:center;background:var(--tint);color:var(--berry);flex:none}
.hv .tile svg{width:60%;height:60%}
.hv .chat{display:flex;flex-direction:column;gap:10px}
.hv .who{align-self:center;display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:12px}
.hv .who img{width:84px;height:84px;object-fit:contain;animation:hvFloat 5s ease-in-out infinite}
.hv .who span{background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 14px;font-weight:600;font-size:15px}
.hv .bub{max-width:82%;align-self:flex-start;background:var(--gray);border-radius:22px;padding:13px 18px;font-size:clamp(15px,.85rem + .3vw,18px);line-height:1.45;position:relative}
.hv .bub.me{align-self:flex-end;background:var(--tint);color:#7a2f63}
.hv .chat .b1{animation:hvPop .5s .2s both}.hv .chat .b2{animation:hvPop .5s 1.1s both}.hv .chat .b3{animation:hvPop .5s 2.4s both}
.hv .done{display:flex;flex-direction:column;gap:16px}
.hv .signed{display:flex;align-items:center;gap:16px;background:var(--gray);border-radius:26px;padding:22px 24px}
.hv .sig-ic{width:52px;height:52px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;flex:none}
.hv .signed .k{font-size:14px;color:var(--soft)}
.hv .signed .v{margin-top:4px;font-size:clamp(18px,.9rem + .8vw,24px);font-weight:650;letter-spacing:-.02em}
.hv .signed .ok{margin-left:auto;width:32px;height:32px;border-radius:50%;background:#e5f6ec;color:#1f8a4c;display:grid;place-items:center;flex:none;animation:hvPop .5s .5s both}
.hv .signed .ok svg{width:18px;height:18px;stroke-width:2.4}
.hv .dots{display:inline-flex;gap:6px;background:var(--gray);border-radius:999px;padding:16px 20px;align-self:flex-start}
.hv .dots i{width:9px;height:9px;border-radius:50%;background:#b9b7bf;animation:hvDot 1.1s infinite}
.hv .dots i:nth-child(2){animation-delay:.15s}.hv .dots i:nth-child(3){animation-delay:.3s}

.hv .split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(32px,6vw,96px);align-items:center}
.hv .split.flip .copy{order:2}
.hv .split .copy{max-width:520px}
.hv .visual{display:flex;justify-content:center}
.hv .phone{position:relative;width:min(380px,100%);background:#fff;border-radius:40px;padding:56px 18px 18px;box-shadow:0 1px 0 var(--line),0 40px 80px -50px rgba(22,21,26,.35)}
.hv .ph-head{position:absolute;left:50%;top:-34px;transform:translateX(-50%);text-align:center;background:#fff;border-radius:20px;padding:4px 16px 8px;box-shadow:0 10px 24px -16px rgba(22,21,26,.3)}
.hv .ph-head img{width:56px;height:56px;object-fit:contain;margin:0 auto}
.hv .ph-head .nm{font-weight:650;font-size:15px}
.hv .ph-head .st{font-size:12.5px;color:var(--muted)}
.hv .ph-body{display:flex;flex-direction:column;gap:10px;padding-top:8px}
.hv .phone .bub{font-size:15px;padding:12px 15px;border-radius:20px}
.hv .react{position:absolute;right:-6px;bottom:-12px;background:#fff;color:var(--berry);border:1px solid #f1d3e5;border-radius:999px;font-size:12px;line-height:1;padding:4px 7px}
.hv .file{align-self:flex-start;width:90%;display:flex;align-items:center;gap:12px;border:1px solid var(--line);border-radius:18px;padding:12px 14px}
.hv .pdf{width:38px;height:44px;border-radius:8px;background:#d64545;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:end center;padding-bottom:6px;flex:none}
.hv .fk{font-weight:600;font-size:14.5px}.hv .fv{font-size:13px;color:var(--muted);margin-top:2px}
.hv .phone .dots{padding:12px 16px}.hv .phone .dots i{width:7px;height:7px}
.hv .ph-input{margin-top:16px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:999px;padding:8px 8px 8px 18px;font-size:16px}
.hv .send{width:36px;height:36px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center}
.hv .send svg{width:18px;height:18px}
.hv .ask{border:1px solid var(--line);border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:10px}
.hv .ask-k{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14.5px}
.hv .ask-k svg{width:18px;height:18px;color:var(--berry)}
.hv .ask-v{background:#F8F8F8;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.5;color:var(--soft)}
.hv .b-send,.hv .b-edit{display:block;text-align:center;border-radius:999px;padding:12px;font-weight:600;font-size:15px}
.hv .b-send{background:var(--ink);color:#fff}.hv .b-edit{background:var(--gray)}

.hv .rv .d1,.hv .rv .d2,.hv .rv .d3,.hv .rv .d4{opacity:0}
.hv .rv.in .d1{animation:hvPop .5s .25s both}.hv .rv.in .d2{animation:hvPop .5s .9s both}.hv .rv.in .d3{animation:hvPop .5s 1.6s both}.hv .rv.in .d4{animation:hvPop .5s 2.2s both}

.hv .vault{width:min(380px,100%);background:#fff;border-radius:36px;padding:32px 26px;text-align:center;box-shadow:0 1px 0 var(--line),0 40px 80px -50px rgba(22,21,26,.35)}
.hv .v-ic{width:72px;height:72px;border-radius:22px;margin:0 auto;display:grid;place-items:center;background:#F8F8F8;color:var(--ink);box-shadow:0 8px 20px -12px rgba(22,21,26,.3)}
.hv .v-ic svg{width:36px;height:36px}
.hv .v-t{margin:16px 0 18px;font-weight:650;font-size:18px}
.hv .v-row{display:flex;align-items:center;gap:10px;background:#F8F8F8;border-radius:14px;padding:13px 14px;font-size:15px;text-align:left;margin-top:8px}
.hv .v-row svg{width:18px;height:18px;color:var(--berry);flex:none}

.hv .pair{position:relative;display:flex;align-items:center;width:min(520px,100%)}
.hv .today{width:46%;background:#fff;border-radius:28px;padding:22px 20px;box-shadow:0 1px 0 var(--line),0 30px 60px -40px rgba(22,21,26,.3);transform:translateX(18px)}
.hv .ideas{position:relative;z-index:2;width:62%;background:#fff;border-radius:30px;padding:24px 22px;box-shadow:0 1px 0 var(--line),0 40px 80px -40px rgba(22,21,26,.4)}
.hv .t-h{font-size:19px;font-weight:650;margin-bottom:12px}
.hv .t-i{display:flex;align-items:center;gap:10px;font-size:14px;padding:8px 0;color:var(--ink)}
.hv .t-i.on{color:var(--berry);font-weight:600}
.hv .t-i.done{color:var(--muted)}
.hv .box{width:18px;height:18px;border-radius:5px;border:1.5px solid #cfcdd4;flex:none;display:grid;place-items:center}
.hv .t-i.on .box{border-radius:50%;border-color:var(--berry);background:radial-gradient(circle,var(--berry) 35%,transparent 40%)}
.hv .t-i.done .box{background:#cfcdd4;border-color:#cfcdd4;color:#fff}
.hv .t-i.done .box svg{width:12px;height:12px;stroke-width:3}
.hv .idea{display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
.hv .idea:first-of-type{border-top:0}
.hv .i-ic{width:34px;height:34px;border-radius:10px;background:var(--tint);color:var(--berry);display:grid;place-items:center;flex:none}
.hv .i-ic svg{width:18px;height:18px}
.hv .i-t{font-weight:600;font-size:14.5px}
.hv .i-d{margin-top:3px;font-size:13px;line-height:1.45;color:var(--muted)}

.hv .price-card{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);margin:44px auto 0;max-width:940px;text-align:left;background:#fff;border-radius:32px;overflow:hidden;box-shadow:0 1px 0 var(--line),0 40px 80px -55px rgba(22,21,26,.35)}
.hv .price-top{padding:clamp(28px,4vw,44px);background:radial-gradient(80% 70% at 20% 10%,#ffe8f2,transparent 70%),radial-gradient(70% 60% at 90% 90%,#efe9ff,transparent 70%),#fff;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:14px}
.hv .price{font-size:clamp(56px,1rem + 5vw,80px);font-weight:650;letter-spacing:-.05em;line-height:1}
.hv .price span{font-size:18px;font-weight:500;letter-spacing:0;color:var(--soft);margin-left:4px}
.hv .per{color:var(--soft);font-size:16px;margin-bottom:6px}
.hv .fine{font-size:13.5px;color:var(--muted);line-height:1.6}
.hv .price-card ul{list-style:none;padding:clamp(28px,4vw,44px);display:flex;flex-direction:column;gap:13px}
.hv .price-card li{display:flex;align-items:center;gap:12px;font-size:16px}
.hv .tick{width:24px;height:24px;border-radius:50%;background:var(--tint);color:var(--berry);display:grid;place-items:center;flex:none}
.hv .tick svg{width:13px;height:13px;stroke-width:2.6}
.hv .broker{margin-top:24px;font-size:15px;color:var(--soft)}
.hv .broker a{color:var(--ink);text-decoration:underline;text-underline-offset:3px}

.hv .learn{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(32px,6vw,80px);align-items:center}
.hv .rows{display:flex;flex-direction:column}
.hv .row{display:flex;align-items:center;gap:18px;padding:24px 20px;border-radius:22px;border-bottom:1px solid var(--line);transition:background .2s}
.hv .row:last-child{border-bottom:0}
.hv .row:hover{background:#fff}
.hv .r-ic{color:var(--ink);flex:none}.hv .r-ic svg{width:24px;height:24px}
.hv .r-tx{display:flex;flex-direction:column;gap:6px}
.hv .r-t{font-weight:650;font-size:18px;letter-spacing:-.01em}
.hv .r-d{font-size:15px;line-height:1.5;color:var(--soft)}
.hv .r-go{margin-left:auto;color:var(--muted);flex:none}

.hv .final{text-align:center;padding:clamp(120px,16vw,200px) 16px clamp(110px,14vw,180px)}
.hv .final-ctas{margin-top:34px;display:flex;flex-direction:column;align-items:center;gap:12px}
.hv .final-ctas .btn{width:min(340px,100%)}

.hv .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;padding:28px clamp(16px,5vw,64px);border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.hv .fmark{display:flex;align-items:center;gap:14px}
.hv .fmark img{height:20px;width:auto}
.hv .foot nav{display:flex;gap:24px}
.hv .foot nav a:hover{color:var(--ink)}

.hv .sub.strong{color:var(--ink);font-weight:600}
.hv .kv{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:14px;color:var(--ink)}
.hv .kv span{color:var(--muted)}
.hv .shot{width:min(420px,100%);border-radius:32px;overflow:hidden;background:#fff;padding:10px;box-shadow:0 1px 0 var(--line),0 40px 80px -50px rgba(22,21,26,.35)}
.hv .shot img{border-radius:24px}
.hv .setup-berry{width:96px;margin:0 auto 18px;animation:hvFloat 5s ease-in-out infinite}
.hv .pill-note{display:inline-block;margin-top:24px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:9px 18px;font-size:14.5px;font-weight:500}
.hv .final .sub{max-width:560px;margin-left:auto;margin-right:auto}
.hv .final-ctas .fine{margin-top:4px}
.hv .final-ctas .broker{margin-top:14px}
.hv .rv{opacity:0;transform:translateY(28px);transition:opacity .9s ease,transform .9s cubic-bezier(.2,.9,.3,1)}
.hv .rv.in{opacity:1;transform:none}

@keyframes hvFloat{50%{transform:translateY(-6px)}}
@keyframes hvRot{from{opacity:0;transform:translateY(.4em);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes hvNudge{50%{transform:translateY(3px)}}
@keyframes hvBeat{from{opacity:0;transform:scale(.97) translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes hvPop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
@keyframes hvDot{0%,100%{opacity:.35}50%{opacity:1}}

@media (max-width:860px){
  .hv .hide-sm{display:none}
  .hv .split,.hv .learn{grid-template-columns:1fr}
  .hv .split.flip .copy{order:0}
  .hv .split .copy{max-width:none}
  .hv .visual{margin-top:20px}
  .hv .price-card{grid-template-columns:1fr}
}
@media (max-width:520px){
  .hv .pair{flex-direction:column;align-items:stretch}
  .hv .today{width:100%;transform:none}
  .hv .ideas{width:100%;margin-top:-10px}
}
@media (prefers-reduced-motion:reduce){
  .hv *{animation:none!important;transition:none!important}
  .hv .rv,.hv .rv .d1,.hv .rv .d2,.hv .rv .d3,.hv .rv .d4{opacity:1;transform:none}
}
`
