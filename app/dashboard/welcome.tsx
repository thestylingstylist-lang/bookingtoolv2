"use client"
// The first time a new agent lands in Marvberry (right after booking their setup call):
// 1. A slow, soft "Welcome to Marvberry" with the berry, like a new Mac saying hello.
// 2. A short chat with their assistant: it introduces itself, they name it, confirm their
//    brokerage, see their booking page, add the calendar to their phone, and pick a first step.
// 3. "Show me around" runs the sidebar tour, ending on their setup documents.
// Plays once per browser. Soft click sounds on taps (browsers only allow sound after a tap).
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { saveAssistantName, saveBrokerage } from "./welcome-actions"

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

type Props = {
  first: string
  callLabel: string
  fullName: string
  brokerage: string
  slug: string
  headshot: string
  feedPath: string
}

export default function Welcome(props: Props) {
  const { first, callLabel } = props
  const router = useRouter()
  const [phase, setPhase] = useState<"off" | "hello" | "chat" | "tour">("off")
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
    setTimeout(() => setPhase("chat"), 700)
  }

  if (phase === "off") return null

  if (phase === "chat")
    return createPortal(
      <Chat
        {...props}
        onTour={() => {
          setI(0)
          setPhase("tour")
        }}
        onDone={(href) => {
          try {
            localStorage.setItem(SEEN, "1")
          } catch {}
          setPhase("off")
          router.replace(href)
        }}
      />,
      document.body,
    )

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

// --- The onboarding chat ---
type Msg = { id: number; from: "bot" | "me" | "card"; text: string; heart?: boolean }
type Ask =
  | { kind: "chips"; options: string[]; own?: boolean }
  | { kind: "input"; placeholder: string; value: string; button: string }
const NAMES = ["Marvberry", "Sage", "Marv"]
const pop = () => tone(880, 0, 0.12, 0.035)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Chat({
  first,
  callLabel,
  fullName,
  brokerage,
  slug,
  headshot,
  feedPath,
  onTour,
  onDone,
}: Props & { onTour: () => void; onDone: (href: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [name, setName] = useState("Marvberry")
  const [brk, setBrk] = useState(brokerage)
  const [draft, setDraft] = useState("")
  const [typingOwn, setTypingOwn] = useState(false)
  const [err, setErr] = useState("")
  const answer = useRef<((v: string) => void) | null>(null)
  const feed = useRef<HTMLDivElement>(null)
  const ran = useRef(false)
  const nameRef = useRef("Marvberry")
  const link = `marvberry.com/book/${slug}`

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" })
  }, [msgs, typing, ask])

  const add = (m: Omit<Msg, "id">) => setMsgs((xs) => [...xs, { ...m, id: xs.length + Math.random() }])
  const say = async (text: string, status?: string, ms = 1100) => {
    setTyping(status ?? `${nameRef.current} is typing`)
    await sleep(ms)
    setTyping(null)
    add({ from: "bot", text })
    pop()
    await sleep(250)
  }
  const wait = (a: Ask) =>
    new Promise<string>((r) => {
      if (a.kind === "input") setDraft(a.value)
      setErr("")
      setTypingOwn(false)
      setAsk(a)
      answer.current = r
    })
  const reply = (v: string) => {
    click()
    setAsk(null)
    setTypingOwn(false)
    answer.current?.(v)
  }

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      await sleep(400)
      await say(
        `Hey${first ? ` ${first}` : ""}, I’m your follow-up assistant. I keep your clients in the loop and handle the paperwork around every deal, so nothing gets dropped.`,
      )
      await say("What would you like to call me? You can always change this later.")
      const picked = await wait({ kind: "chips", options: NAMES, own: true })
      add({ from: "me", text: picked })
      await sleep(450)
      setMsgs((xs) => xs.map((m, k) => (k === xs.length - 1 ? { ...m, heart: true } : m)))
      tone(1046.5, 0, 0.18, 0.04)
      nameRef.current = picked
      setName(picked)
      void saveAssistantName(picked)
      await say(picked === "Marvberry" ? "Marvberry it is. So happy to meet you." : `${picked} it is. I love it.`)

      await say("How should your clients see you? Here’s the brokerage on your page right now.")
      const b = await wait({ kind: "input", placeholder: "Your brokerage", value: brokerage, button: "That’s it" })
      add({ from: "me", text: b })
      setBrk(b)
      if (b !== brokerage) void saveBrokerage(b)

      await say("Your booking page is ready.", `${nameRef.current} is updating your page`, 1600)
      add({ from: "card", text: "" })
      pop()
      await sleep(600)
      await say("Here it is, with your name on it. Want your showings and bookings on your phone’s calendar too?")
      const cal = await wait({ kind: "chips", options: ["Add to my calendar", "Maybe later"] })
      add({ from: "me", text: cal })
      if (cal === "Add to my calendar") {
        window.location.href = `webcal://${feedPath}`
        await say("Done. Your phone will ask you to confirm, and then everything shows up there.", `${nameRef.current} is connecting your calendar`, 1400)
      } else await say("No problem. It’s on your Calendar page whenever you want it.")

      await say(
        `You’re all set.${callLabel ? ` Your setup call is ${callLabel}.` : ""} What can I do for you first?`,
      )
      for (;;) {
        const go = await wait({ kind: "chips", options: ["Add my first client", "Send my booking link", "Show me around"] })
        add({ from: "me", text: go })
        if (go === "Add my first client") {
          await say("Let’s do it. Taking you to your clients.", `${nameRef.current} is opening Clients`, 900)
          await sleep(500)
          return onDone("/clients")
        }
        if (go === "Show me around") {
          await say("Happy to. Follow the glow.", undefined, 700)
          await sleep(400)
          return onTour()
        }
        try {
          await navigator.clipboard.writeText(`https://www.${link}`)
          await say("Copied. Paste it in your Instagram bio, your email signature, or a text to a client.")
        } catch {
          await say(`Here it is: ${link}. Paste it in your Instagram bio, your email signature, or a text to a client.`)
        }
        await say("Anything else?")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initial = (fullName || first || "M").trim().charAt(0).toUpperCase()

  return (
    <div className="mbw-chat" role="dialog" aria-label={`Meet ${name}`}>
      <style>{CSS}</style>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="box">
        <div className="hd">
          <img src="/brand/berry.webp" alt="" className="av" />
          <div>
            <p className="nm">{name}</p>
            <p className="st">{typing ? "typing…" : "Online"}</p>
          </div>
          <button type="button" className="x" onClick={() => onDone("/dashboard")}>
            Skip
          </button>
        </div>
        <div className="feed" ref={feed} aria-live="polite">
          {msgs.map((m) =>
            m.from === "card" ? (
              <div key={m.id} className="page">
                <p className="eyebrow">Your booking page</p>
                <div className="who">
                  {headshot ? <img src={headshot} alt="" className="hs" /> : <div className="hs ini">{initial}</div>}
                  <div>
                    <p className="pn">{fullName || first}</p>
                    <p className="pb">{brk}</p>
                  </div>
                </div>
                <p className="url">{link}</p>
              </div>
            ) : (
              <div key={m.id} className={`b ${m.from}`}>
                {m.text}
                {m.heart && <span className="heart" aria-label="loved">&#9829;</span>}
              </div>
            ),
          )}
          {typing && (
            <p className="typing">
              <span className="dots"><i /><i /><i /></span>
              {typing}
            </p>
          )}
        </div>
        <div className="ask">
          {ask?.kind === "chips" && !typingOwn && (
            <div className="chips">
              {ask.options.map((o) => (
                <button key={o} type="button" className="chip" onClick={() => reply(o)}>
                  {o}
                </button>
              ))}
              {ask.own && (
                <button type="button" className="own" onClick={() => { click(); setDraft(""); setTypingOwn(true) }}>
                  Type my own
                </button>
              )}
            </div>
          )}
          {(ask?.kind === "input" || typingOwn) && (
            <form
              className="field"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return setErr(typingOwn ? "Type a name first" : "Type your brokerage first")
                reply(draft.trim())
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={typingOwn ? 30 : 120}
                placeholder={typingOwn ? "A name you like" : ask?.kind === "input" ? ask.placeholder : ""}
                onChange={(e) => { setDraft(e.target.value); setErr("") }}
              />
              <button type="submit">{typingOwn ? "Send" : ask?.kind === "input" ? ask.button : "Send"}</button>
              {err && <p className="err">{err}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
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

.mbw-chat{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow:hidden;background:#fff;padding:16px;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#16151a;animation:mbwIn .5s ease both}
.mbw-chat .blob{position:absolute;width:60vmax;height:60vmax;border-radius:50%;filter:blur(80px);opacity:.6}
.mbw-chat .b1{background:#ffd2e6;left:-15vmax;top:-20vmax;animation:mbwDrift 14s ease-in-out infinite alternate}
.mbw-chat .b2{background:#ffe2cf;right:-20vmax;top:-5vmax;animation:mbwDrift 17s ease-in-out infinite alternate-reverse}
.mbw-chat .b3{background:#e3dcff;left:10vmax;bottom:-30vmax;animation:mbwDrift 19s ease-in-out infinite alternate}
.mbw-chat .box{position:relative;width:min(460px,100%);height:min(680px,calc(100dvh - 32px));display:flex;flex-direction:column;
  background:rgba(255,255,255,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(22,21,26,.07);border-radius:28px;
  box-shadow:0 40px 90px -30px rgba(22,21,26,.35);overflow:hidden}
.mbw-chat .hd{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(22,21,26,.06)}
.mbw-chat .av{width:42px;height:42px;object-fit:cover;-webkit-mask-image:radial-gradient(circle,#000 46%,transparent 70%);mask-image:radial-gradient(circle,#000 46%,transparent 70%);animation:mbwFloat 5s ease-in-out infinite}
.mbw-chat .nm{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em}
.mbw-chat .st{margin:1px 0 0;font-size:12.5px;color:#8d8b92}
.mbw-chat .x{margin-left:auto;font:inherit;font-size:13px;color:#8d8b92;background:none;border:0;cursor:pointer;padding:6px}
.mbw-chat .feed{flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:10px}
.mbw-chat .b{position:relative;max-width:84%;padding:11px 14px;border-radius:18px;font-size:15px;line-height:1.5;animation:mbwMsg .35s cubic-bezier(.2,1.2,.4,1) both}
.mbw-chat .bot{align-self:flex-start;background:#fff;border:1px solid rgba(22,21,26,.07);border-bottom-left-radius:6px}
.mbw-chat .me{align-self:flex-end;background:#BC559E;color:#fff;border-bottom-right-radius:6px}
@keyframes mbwMsg{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
.mbw-chat .heart{position:absolute;right:-6px;bottom:-10px;background:#fff;color:#BC559E;border:1px solid #f3d6e7;border-radius:999px;font-size:12px;line-height:1;padding:3px 6px;animation:mbwPop .6s cubic-bezier(.2,1.6,.4,1) both}
.mbw-chat .typing{margin:2px 0 0;align-self:flex-start;display:flex;align-items:center;gap:8px;font-size:12.5px;color:#93407A}
.mbw-chat .dots{display:inline-flex;gap:3px}
.mbw-chat .dots i{width:5px;height:5px;border-radius:50%;background:#BC559E;animation:mbwDot 1s infinite}
.mbw-chat .dots i:nth-child(2){animation-delay:.15s}.mbw-chat .dots i:nth-child(3){animation-delay:.3s}
@keyframes mbwDot{0%,100%{opacity:.25}50%{opacity:1}}
.mbw-chat .page{align-self:stretch;background:#fff;border:1px solid rgba(22,21,26,.07);border-radius:18px;padding:16px;animation:mbwMsg .5s cubic-bezier(.2,1.2,.4,1) both}
.mbw-chat .eyebrow{margin:0;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#BC559E}
.mbw-chat .who{display:flex;align-items:center;gap:12px;margin-top:12px}
.mbw-chat .hs{width:46px;height:46px;border-radius:50%;object-fit:cover}
.mbw-chat .ini{display:grid;place-items:center;background:#FBEDF5;color:#93407A;font-weight:600}
.mbw-chat .pn{margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em}
.mbw-chat .pb{margin:2px 0 0;font-size:13.5px;color:#55535b}
.mbw-chat .url{margin:14px 0 0;padding-top:12px;border-top:1px solid rgba(22,21,26,.06);font-size:13px;color:#8d8b92}
.mbw-chat .ask{padding:10px 18px 18px;min-height:64px}
.mbw-chat .chips{display:flex;flex-wrap:wrap;gap:8px;animation:mbwUp .4s ease both}
.mbw-chat .chip{font:inherit;font-size:14px;padding:10px 16px;border-radius:999px;border:1px solid #efc9df;background:#FBEDF5;color:#93407A;cursor:pointer;transition:transform .15s}
.mbw-chat .chip:hover{transform:translateY(-1px)}
.mbw-chat .own{font:inherit;font-size:13.5px;color:#8d8b92;background:none;border:0;cursor:pointer;padding:10px 6px;text-decoration:underline;text-underline-offset:3px}
.mbw-chat .field{display:flex;flex-wrap:wrap;gap:8px;animation:mbwUp .4s ease both}
.mbw-chat .field input{flex:1;min-width:0;font:inherit;font-size:15px;padding:11px 14px;border-radius:14px;border:1px solid rgba(22,21,26,.12);background:#fff;color:#16151a;outline:none}
.mbw-chat .field input:focus{border-color:#BC559E;box-shadow:0 0 0 3px #FBEDF5}
.mbw-chat .field button{font:inherit;font-size:14px;font-weight:550;padding:11px 18px;border-radius:999px;border:0;background:#16151a;color:#fff;cursor:pointer}
.mbw-chat .err{width:100%;margin:0;font-size:12.5px;color:#b3261e}
@media (prefers-reduced-motion:reduce){.mbw-hello *,.mbw-tour *,.mbw-chat *{animation-duration:.01s!important;animation-delay:0s!important;transition:none!important}}
`
