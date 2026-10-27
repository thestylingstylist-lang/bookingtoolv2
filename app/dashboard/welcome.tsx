"use client"
// The first time a new agent lands in Marvberry (right after booking their setup call):
// 1. A slow, soft "Welcome to Marvberry" with the berry, like a new Mac saying hello.
// 2. A short tour: each part of the sidebar lights up with one line about it.
// 3. It ends on their setup documents, so they can upload them before the call.
// Plays once per browser. Soft click sounds on taps (browsers only allow sound after a tap).
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"

const SEEN = "mb-welcomed"

type Stop = { sel: string; title: string; line: string }
const STOPS: Stop[] = [
  { sel: 'a[href="/dashboard"]', title: "Home", line: "Every morning, this is where you see what matters today." },
  { sel: 'a[href="/clients"]', title: "Clients", line: "Every client lives here, with their steps, documents and messages in one place." },
  { sel: 'a[href="/calendar"]', title: "Calendar", line: "Your showings, closings and bookings, all on one calendar." },
  { sel: 'a[href="/bookings"]', title: "Bookings", line: "Everyone who books through your link shows up here." },
  { sel: 'a[href="/templates"]', title: "Templates", line: "Your agreements and documents, ready to send in one click." },
  { sel: 'a[href="/settings"]', title: "Settings", line: "Your booking link, your hours, your brand and your email signature." },
  { sel: "#setup-card", title: "One last thing", line: "Upload these before our call, and we’ll turn them into ready-to-use templates for you." },
]

// --- Sound: tiny, soft, made in the browser (no files to load) ---
let ctx: AudioContext | null = null
function audio() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  } catch {
    return null
  }
}
function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}
const click = () => tone(1400, 0, 0.05, 0.05, "triangle")
const chime = () => {
  tone(659.25, 0, 0.9, 0.07)
  tone(987.77, 0.12, 1.1, 0.06)
  tone(1318.5, 0.24, 1.3, 0.035)
}

function visible(el: Element | null): el is HTMLElement {
  if (!el) return false
  const r = (el as HTMLElement).getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export default function Welcome({ first, callLabel }: { first: string; callLabel: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<"off" | "hello" | "tour">("off")
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [leaving, setLeaving] = useState(false)
  const raf = useRef(0)

  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(SEEN) === "1"
    } catch {}
    if (seen) {
      router.replace("/dashboard")
      return
    }
    setPhase("hello")
  }, [router])

  const stops = STOPS.filter((s) => s.sel !== "#setup-card" || (typeof document !== "undefined" && !!document.querySelector(s.sel)))

  const measure = useCallback(() => {
    if (phase !== "tour") return
    const stop = stops[i]
    const el = [...document.querySelectorAll(stop?.sel ?? "")].find(visible) ?? null
    setRect(el ? el.getBoundingClientRect() : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i])

  useEffect(() => {
    if (phase !== "tour") return
    const stop = stops[i]
    const el = [...document.querySelectorAll(stop?.sel ?? "")].find(visible)
    if (el && stop.sel === "#setup-card") el.scrollIntoView({ behavior: "smooth", block: "center" })
    measure()
    const on = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(measure)
    }
    const t = setTimeout(measure, 450)
    window.addEventListener("resize", on)
    window.addEventListener("scroll", on, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener("resize", on)
      window.removeEventListener("scroll", on, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i, measure])

  const finish = () => {
    try {
      localStorage.setItem(SEEN, "1")
    } catch {}
    setPhase("off")
    router.replace("/dashboard")
  }

  const start = () => {
    chime()
    setLeaving(true)
    setTimeout(() => {
      setPhase("tour")
      setI(0)
    }, 700)
  }

  if (phase === "off") return null

  if (phase === "hello")
    return createPortal(
      <div className={`mbw-hello${leaving ? " out" : ""}`} role="dialog" aria-label="Welcome to Marvberry">
        <style>{CSS}</style>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="center">
          <img src="/brand/berry.webp" alt="" className="berry" />
          <svg className="word" viewBox="0 0 900 120" aria-hidden>
            <text x="50%" y="88" textAnchor="middle">Welcome to Marvberry</text>
          </svg>
          <h1 className="sr">Welcome to Marvberry</h1>
          <p className="sub">
            {first ? `Hi ${first}. ` : ""}
            {callLabel ? `Your setup call is booked for ${callLabel}.` : "Let’s get you set up."}
          </p>
          <button type="button" className="go" onClick={start}>
            Let&rsquo;s go <span aria-hidden>&rarr;</span>
          </button>
        </div>
      </div>,
      document.body,
    )

  const stop = stops[i]
  const last = i === stops.length - 1
  const pad = 8
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null
  // Card sits to the right of the spotlight when there's room, otherwise below it, otherwise centered.
  let card: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%,-50%)" }
  if (spot && typeof window !== "undefined") {
    const w = 340
    if (spot.left + spot.width + 20 + w < window.innerWidth)
      card = { left: spot.left + spot.width + 20, top: Math.max(16, Math.min(spot.top - 8, window.innerHeight - 220)) }
    else if (spot.top + spot.height + 16 + 200 < window.innerHeight)
      card = { left: Math.max(16, Math.min(spot.left, window.innerWidth - w - 16)), top: spot.top + spot.height + 16 }
    else card = { left: Math.max(16, Math.min(spot.left, window.innerWidth - w - 16)), top: Math.max(16, spot.top - 216) }
  }

  return createPortal(
    <div className="mbw-tour" role="dialog" aria-label="A quick tour of Marvberry">
      <style>{CSS}</style>
      {spot ? <div className="spot" style={spot} /> : <div className="dim" />}
      <div className="card" style={card} key={i}>
        <p className="count">
          {i + 1} of {stops.length}
        </p>
        <p className="title">{stop.title}</p>
        <p className="line">{stop.line}</p>
        <div className="row">
          <button
            type="button"
            className="skip"
            onClick={() => {
              click()
              finish()
            }}
          >
            {last ? "" : "Skip tour"}
          </button>
          <div className="btns">
            {i > 0 && (
              <button
                type="button"
                className="back"
                onClick={() => {
                  click()
                  setI(i - 1)
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="next"
              onClick={() => {
                click()
                if (last) {
                  chime()
                  finish()
                } else setI(i + 1)
              }}
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const CSS = `
.mbw-hello{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow:hidden;background:#fff;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;animation:mbwIn .6s ease both;transition:opacity .7s ease,transform .7s ease}
.mbw-hello.out{opacity:0;transform:scale(1.03)}
@keyframes mbwIn{from{opacity:0}to{opacity:1}}
.mbw-hello .blob{position:absolute;width:60vmax;height:60vmax;border-radius:50%;filter:blur(80px);opacity:.75}
.mbw-hello .b1{background:#ffd2e6;left:-15vmax;top:-20vmax;animation:mbwDrift 14s ease-in-out infinite alternate}
.mbw-hello .b2{background:#ffe2cf;right:-20vmax;top:-5vmax;animation:mbwDrift 17s ease-in-out infinite alternate-reverse}
.mbw-hello .b3{background:#e3dcff;left:10vmax;bottom:-30vmax;animation:mbwDrift 19s ease-in-out infinite alternate}
@keyframes mbwDrift{to{transform:translate(6vmax,4vmax) scale(1.1)}}
.mbw-hello .center{position:relative;text-align:center;padding:24px;max-width:960px;width:100%}
.mbw-hello .berry{width:150px;height:150px;margin:0 auto;display:block;
  -webkit-mask-image:radial-gradient(circle,#000 40%,transparent 66%);mask-image:radial-gradient(circle,#000 40%,transparent 66%);
  animation:mbwPop 1.4s cubic-bezier(.2,1.4,.4,1) .3s both, mbwFloat 5s ease-in-out 1.8s infinite}
@keyframes mbwPop{from{opacity:0;transform:scale(.4) translateY(30px)}to{opacity:1;transform:none}}
@keyframes mbwFloat{50%{transform:translateY(-8px)}}
.mbw-hello .word{display:block;width:100%;max-width:880px;height:auto;margin:10px auto 0;overflow:visible}
.mbw-hello .word text{font-family:var(--font-geist-sans),-apple-system,sans-serif;font-size:84px;font-weight:600;letter-spacing:-3px;
  fill:#16151a;fill-opacity:0;stroke:#BC559E;stroke-width:1.4;stroke-dasharray:1400;stroke-dashoffset:1400;
  animation:mbwDraw 3.2s cubic-bezier(.45,0,.2,1) 1s forwards, mbwFill 1.2s ease 3.6s forwards}
@keyframes mbwDraw{to{stroke-dashoffset:0}}
@keyframes mbwFill{to{fill-opacity:1;stroke-opacity:0}}
.mbw-hello .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.mbw-hello .sub{margin:14px 0 0;font-size:clamp(17px,1rem + .4vw,21px);line-height:1.5;color:#55535b;opacity:0;animation:mbwUp .9s ease 4.4s forwards}
.mbw-hello .go{margin-top:34px;font:inherit;font-size:17px;font-weight:550;padding:16px 30px;border-radius:999px;border:0;background:#16151a;color:#fff;cursor:pointer;
  box-shadow:0 12px 30px -12px rgba(22,21,26,.55);opacity:0;animation:mbwUp .9s ease 5s forwards;transition:transform .2s}
.mbw-hello .go:hover{transform:translateY(-1px)}
@keyframes mbwUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

.mbw-tour{position:fixed;inset:0;z-index:100;font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.mbw-tour .dim{position:fixed;inset:0;background:rgba(22,21,26,.45)}
.mbw-tour .spot{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(22,21,26,.45),0 0 0 3px #BC559E,0 0 30px 6px rgba(188,85,158,.45);
  transition:top .45s cubic-bezier(.3,.9,.3,1),left .45s cubic-bezier(.3,.9,.3,1),width .45s,height .45s;pointer-events:none}
.mbw-tour .card{position:fixed;width:min(340px,calc(100vw - 32px));background:#fff;border-radius:20px;padding:20px 22px 16px;
  box-shadow:0 30px 70px -20px rgba(22,21,26,.5);animation:mbwCard .45s cubic-bezier(.2,1.2,.4,1) both}
@keyframes mbwCard{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
.mbw-tour .card[style*="translate(-50%"]{animation:none}
.mbw-tour .count{margin:0;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#BC559E}
.mbw-tour .title{margin:8px 0 0;font-size:20px;font-weight:620;letter-spacing:-.02em;color:#16151a}
.mbw-tour .line{margin:6px 0 0;font-size:15px;line-height:1.55;color:#55535b}
.mbw-tour .row{display:flex;align-items:center;justify-content:space-between;margin-top:18px}
.mbw-tour .btns{display:flex;gap:8px}
.mbw-tour button{font:inherit;cursor:pointer;border:0;background:none}
.mbw-tour .skip{font-size:13.5px;color:#8d8b92;padding:6px 0}
.mbw-tour .back{font-size:14px;padding:9px 14px;border-radius:999px;color:#16151a}
.mbw-tour .next{font-size:14px;font-weight:550;padding:9px 18px;border-radius:999px;background:#16151a;color:#fff}
@media (prefers-reduced-motion:reduce){.mbw-hello *,.mbw-tour *{animation-duration:.01s!important;animation-delay:0s!important;transition:none!important}}
`
