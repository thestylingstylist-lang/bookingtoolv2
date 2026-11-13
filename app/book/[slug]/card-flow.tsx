"use client"

// The Marvberry Card, start to finish. Editorial, centered, on #FAFAFA. Each tap
// slides to the next page: the card, choose a time, a little about you, you're
// all set; or the free guide (or "Not ready to book?") and its thank-you.
import { useEffect, useMemo, useState, useTransition } from "react"
import { createBooking } from "./actions"
import { logCardEvent, requestContact } from "./card-actions"
import type { Slot } from "@/lib/slots"

type Screen = "card" | "time" | "details" | "done" | "ask" | "sent"

type Props = {
  slug: string
  name: string
  initials: string
  title: string
  tagline: string
  photo: string
  phone: string
  email: string
  address: string
  areas: string
  badge: string
  guideTitle: string
  guideBlurb: string
  license: string
  showMade: boolean
  minutes: number
  timezone: string
  slots: Slot[]
  website: string
  instagram: string
  claimToken: string
}

const LOOKING = [
  { k: "Buy", v: "Buy" },
  { k: "Sell", v: "Sell" },
  { k: "Both", v: "Buy and sell" },
]

export default function CardFlow(p: Props) {
  const [screen, setScreen] = useState<Screen>("card")
  const [back, setBack] = useState(false)
  const [day, setDay] = useState("")
  const [page, setPage] = useState(0)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [looking, setLooking] = useState("Buy")
  const [talk, setTalk] = useState<"phone" | "virtual">("phone")
  const [err, setErr] = useState("")
  const [note, setNote] = useState("")
  const [who, setWho] = useState({ first: "", phone: "", email: "" })
  const [manage, setManage] = useState<string | null>(null)
  const [asked, setAsked] = useState({ guide: false })
  const [pending, start] = useTransition()
  const [inApp, setInApp] = useState(false)
  const first = p.name.split(" ")[0] || "I"
  const q = p.claimToken ? `?claim=${p.claimToken}` : ""
  const [tagA, tagB] = p.tagline.includes("|") ? p.tagline.split("|").map((t) => t.trim()) : ["", ""]

  useEffect(() => {
    setInApp(/Instagram|FBAN|FBAV|LinkedInApp|TikTok/i.test(navigator.userAgent))
    if (p.claimToken) return
    const key = `mb-viewed-${p.slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {}
    logCardEvent(p.slug, "view").catch(() => {})
  }, [p.slug])

  const days = useMemo(() => {
    const m = new Map<string, Slot[]>()
    for (const s of p.slots) {
      if (!m.has(s.dayLabel)) m.set(s.dayLabel, [])
      m.get(s.dayLabel)!.push(s)
    }
    return [...m.entries()].map(([label, slots]) => ({ label, slots }))
  }, [p.slots])
  const shown = days.slice(page * 5, page * 5 + 5)
  const active = days.find((d) => d.label === day) ?? days[0]
  const tzName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: p.timezone, timeZoneName: "long" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value.replace(/ (Standard|Daylight) Time/, " time") ?? ""
    } catch {
      return ""
    }
  }, [p.timezone])

  function go(s: Screen, isBack = false) {
    setBack(isBack)
    setErr("")
    setScreen(s)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function share() {
    const url = `${location.origin}/book/${p.slug}`
    logCardEvent(p.slug, "share").catch(() => {})
    try {
      if (navigator.share) return void (await navigator.share({ title: p.name, text: `${p.name}, real estate agent`, url }))
      await navigator.clipboard.writeText(url)
      setNote("Link copied. Paste it anywhere to share.")
    } catch {}
  }

  function book(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!slot) return go("time", true)
    const f = new FormData(e.currentTarget)
    f.set("slotStart", slot.startISO)
    f.set("meetingType", talk)
    f.set("lookingTo", looking)
    const w = { first: String(f.get("firstName") ?? "").trim(), phone: String(f.get("phone") ?? "").trim(), email: String(f.get("email") ?? "").trim() }
    setErr("")
    start(async () => {
      const r = await createBooking(p.slug, f).catch(() => ({ ok: false as const, error: "That didn’t go through. Try again." }))
      if (!r.ok) return setErr(r.error)
      setWho(w)
      setManage(r.manageToken)
      go("done")
    })
  }

  function ask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setErr("")
    start(async () => {
      const r = await requestContact(p.slug, f).catch(() => ({ ok: false as const, error: "That didn’t go through. Try again." }))
      if (!r.ok) return setErr(r.error)
      setAsked({ guide: r.guide })
      go("sent")
    })
  }

  const Top = ({ to }: { to: Screen }) => (
    <div className="top">
      <button type="button" className="bk" onClick={() => go(to, true)} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <span className="av" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}>{p.photo ? "" : p.initials}</span>
      <span className="s u tn">{p.name}</span>
    </div>
  )

  const BookBtn = () => (
    <button type="button" className="bt main" onClick={() => go("time")}>
      <span className="s t1">Let’s talk about your next home</span>
      <span className="s t2">Choose a time that works for you</span>
    </button>
  )

  return (
    <div className="mbf">
      <div className="side" aria-hidden>
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt="" />
        ) : (
          <div className="ini s">{p.initials}</div>
        )}
      </div>
      <div className="pane">
      <div key={screen} className={`pg ${back ? "back" : ""} ${screen === "card" ? "home" : ""} ${p.claimToken ? "gift" : ""}`}>
        {screen === "card" && (
          <>
            <div className="hero">
              {p.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo} alt={p.name} />
              ) : (
                <div className="ini s" aria-hidden>{p.initials}</div>
              )}
              <div className="fade" />
            </div>
            <div className="in c body">
              <h1 className="s u nm">{p.name}</h1>
              {p.title && <p className="u ttl">{p.title}</p>}
              {tagA ? (
                <>
                  <p className="s i tag1">{tagA}</p>
                  <p className="s tag2">{tagB}</p>
                </>
              ) : p.tagline ? (
                <p className="s tag">{p.tagline}</p>
              ) : (
                <>
                  <p className="s i tag1">Let’s find the one</p>
                  <p className="s tag2">that feels like home</p>
                </>
              )}
              {p.badge && <p className="badge"><span aria-hidden />{p.badge}</p>}

              <div className="btns">
                <BookBtn />
                <button type="button" className="bt" onClick={() => go("ask")}>
                  <span className="s t1">{p.guideTitle || "Not ready to book?"}</span>
                  <span className={`s t2 ${p.guideTitle ? "i" : ""}`}>{p.guideTitle ? "You’re welcome" : `Leave your details and ${first} will reach out`}</span>
                </button>
              </div>

              {p.areas && <p className="s areas">{p.areas}</p>}
              {(p.website || p.instagram) && (
                <div className="more s">
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" className="dot">See my homes ↗</a>
                  )}
                  {p.instagram && (
                    <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer" className="dot" aria-label={`Instagram @${p.instagram}`}>
                      <svg viewBox="0 0 24 24" aria-hidden><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" /></svg>@{p.instagram}
                    </a>
                  )}
                </div>
              )}
              <div className="links s">
                <a href={`/book/${p.slug}/contact${q}`} className="dot" onClick={() => setNote("Saved. Open the download to add it to your contacts.")}>
                  Save contact <svg viewBox="0 0 24 24" aria-hidden><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                </a>
                <button type="button" className="dot" onClick={share}>
                  Share contact <svg viewBox="0 0 24 24" aria-hidden><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>
                </button>
              </div>
              <p className="note" role="status">{note || (inApp ? "To save the contact, open this page in your browser." : "")}</p>
            </div>

            <div className="foot">
              {p.license && <p className="u lic c">License {p.license}</p>}
              {p.showMade && (
                <a className="made u" href="https://marvberry.com/card?ref=card">Made with Marvberry</a>
              )}
            </div>
          </>
        )}

        {screen === "time" && (
          <>
            <Top to="card" />
            <div className="in c">
              <p className="s h">Let’s talk about<br />your next home</p>
              <p className="s i sub">Choose a time that works for you</p>
              {days.length === 0 ? (
                <p className="s empty">No open times right now. Leave your details and {first} will reach out.</p>
              ) : (
                <>
                  <div className="days">
                    <button type="button" className="pgb" disabled={page === 0} onClick={() => setPage((x) => x - 1)} aria-label="Earlier days">‹</button>
                    {shown.map((d) => {
                      const [wd, md] = d.label.split(", ")
                      const on = (active?.label ?? "") === d.label
                      return (
                        <button key={d.label} type="button" className={`day s ${on ? "on" : ""}`} onClick={() => setDay(d.label)}>
                          <small>{wd}</small>
                          <b>{(md ?? "").split(" ")[1] ?? md}</b>
                        </button>
                      )
                    })}
                    <button type="button" className="pgb" disabled={(page + 1) * 5 >= days.length} onClick={() => setPage((x) => x + 1)} aria-label="Later days">›</button>
                  </div>
                  <p className="s month">{active?.label}</p>
                  <div className="times s">
                    {active?.slots.map((s) => (
                      <button key={s.startISO} type="button" className={`tm ${slot?.startISO === s.startISO ? "on" : ""}`} onClick={() => setSlot(s)}>
                        <span>{s.timeLabel}</span>
                        {slot?.startISO === s.startISO && <span className="pip" aria-hidden>●</span>}
                      </button>
                    ))}
                  </div>
                  <p className="fine">{p.minutes} minute call{tzName ? ` · ${tzName}` : ""}</p>
                </>
              )}
              <button type="button" className="bt go s" disabled={!slot && days.length > 0} onClick={() => (days.length ? go("details") : go("ask"))}>
                {days.length ? "Continue" : "Leave my details"}
              </button>
            </div>
          </>
        )}

        {screen === "details" && slot && (
          <>
            <Top to="time" />
            <form className="in c" onSubmit={book}>
              <p className="s h">A little about you</p>
              <p className="s i sub">{slot.dayLabel} · {slot.timeLabel}</p>
              <div className="fields s">
                <div className="pair">
                  <input name="firstName" placeholder="First name" autoComplete="given-name" required />
                  <input name="lastName" placeholder="Last name" autoComplete="family-name" required />
                </div>
                <input name="phone" type="tel" placeholder="Phone" autoComplete="tel" required />
                <input name="email" type="email" placeholder="Email" autoComplete="email" required />
              </div>
              <p className="lbl s">I’m looking to</p>
              <div className="chips s">
                {LOOKING.map((o) => (
                  <button key={o.k} type="button" className={looking === o.v ? "on" : ""} onClick={() => setLooking(o.v)}>{o.k}</button>
                ))}
              </div>
              <p className="lbl s">Talk by</p>
              <div className="chips s">
                <button type="button" className={talk === "phone" ? "on" : ""} onClick={() => setTalk("phone")}>Phone</button>
                <button type="button" className={talk === "virtual" ? "on" : ""} onClick={() => setTalk("virtual")}>Video</button>
              </div>
              {err && <p className="err">{err}</p>}
              <button type="submit" className="bt go s" disabled={pending}>{pending ? "Booking…" : "Confirm my time"}</button>
              <p className="fine">Your details are only used to schedule and prepare for your call. <a href="/privacy">Privacy</a></p>
            </form>
          </>
        )}

        {screen === "done" && slot && (
          <div className="in c mid">
            <span className="av lg" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}>{p.photo ? "" : p.initials}</span>
            <p className="s i tag1" style={{ marginTop: 22 }}>You’re all set,</p>
            <p className="s h" style={{ marginTop: 4 }}>{who.first}</p>
            <p className="s when">{slot.dayLabel}<br />{slot.timeLabel}</p>
            <p className="s i sub">{talk === "phone" ? `${first} will call you at ${who.phone}` : `${first} will send a video link to ${who.email}`}</p>
            <div className="links s" style={{ justifyContent: "center", gap: 22 }}>
              <a className="dot" href={`/book/${p.slug}/ics?start=${encodeURIComponent(slot.startISO)}&type=${talk}`}>Add to calendar</a>
              <a className="dot" href={`/book/${p.slug}/contact${q}`}>Save contact</a>
            </div>
            <p className="fine" style={{ marginTop: 26 }}>
              A confirmation is in your inbox.{manage ? <> <a href={`/manage/${manage}`}>Need to change it?</a></> : null}
            </p>
          </div>
        )}

        {screen === "ask" && (
          <>
            <Top to="card" />
            <form className="in c" onSubmit={ask}>
              <input type="hidden" name="guide" value={p.guideTitle ? "1" : ""} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
              {p.guideTitle ? (
                <>
                  <p className="u kick">Free guide</p>
                  <p className="s h">{p.guideTitle}</p>
                  <p className="s i sub">You’re welcome</p>
                  {p.guideBlurb && <p className="s blurb">{p.guideBlurb}</p>}
                </>
              ) : (
                <>
                  <p className="s h">Not ready to book?</p>
                  <p className="s i sub">Leave your details and {first} will reach out</p>
                </>
              )}
              <div className="fields s">
                <input name="name" placeholder="Your name" autoComplete="name" required />
                <input name="email" type="email" placeholder="Email" autoComplete="email" required />
                {!p.guideTitle && (
                  <>
                    <input name="phone" type="tel" placeholder="Phone (optional)" autoComplete="tel" />
                    <input name="message" placeholder="What are you looking for?" />
                  </>
                )}
              </div>
              {err && <p className="err">{err}</p>}
              <button type="submit" className="bt go s" disabled={pending}>{pending ? "Sending…" : p.guideTitle ? "Send it to me" : "Ask to be contacted"}</button>
              <p className="fine">By sending, you agree {first} can contact you. <a href="/privacy">Privacy</a></p>
            </form>
          </>
        )}

        {screen === "sent" && (
          <div className="in c mid">
            <span className="av lg" style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}>{p.photo ? "" : p.initials}</span>
            <p className="s i tag1" style={{ marginTop: 22 }}>{asked.guide ? "It’s on its way." : "Thank you."}</p>
            <p className="s h" style={{ marginTop: 6 }}>{asked.guide ? "Check your inbox" : `${first} will reach out soon`}</p>
            <p className="s blurb">{asked.guide ? `${p.guideTitle} is waiting for you. ${first} will be in touch soon.` : "Your details are with her now."}</p>
            <div className="btns" style={{ marginTop: 26 }}>
              <BookBtn />
            </div>
            <p className="s" style={{ marginTop: 18 }}>
              <button type="button" className="dot plain" onClick={() => go("card", true)}>Back to the card</button>
            </p>
          </div>
        )}
      </div>
      </div>
      {p.claimToken && (
        <div className="claimbar">
          <p className="s">Made just for you, {first}.</p>
          <a href={`/claim/${p.claimToken}`} className="s">Claim your card</a>
        </div>
      )}
      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
.mbf{min-height:100dvh;background:#FAFAFA;color:#2A2522;font-family:var(--font-geist-sans),system-ui,sans-serif;overflow-x:hidden}
.mbf .side{display:none}
.mbf .pane{min-height:100dvh}
.mbf .pg{max-width:460px;margin:0 auto;min-height:100dvh;display:flex;flex-direction:column;animation:mbfIn .38s cubic-bezier(.2,.8,.2,1) both}
.mbf .pg.back{animation-name:mbfBack}
@keyframes mbfIn{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}
@keyframes mbfBack{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}
.mbf .pg.home .body{flex:1;justify-content:center}
.mbf .foot{margin-top:auto}
@media (min-width:768px){
  .mbf{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);height:100dvh;overflow:hidden}
  .mbf .side{display:block;position:relative;height:100dvh;background:#e7e3dd;overflow:hidden}
  .mbf .side img{width:100%;height:100%;object-fit:cover;object-position:center top}
  .mbf .side .ini{height:100%;display:grid;place-items:center;font-size:120px;color:#9a9188}
  .mbf .pane{height:100dvh;overflow-y:auto}
  .mbf .pg{max-width:480px;min-height:100dvh;padding:0 8px}
  .mbf .pg .hero{display:none}
  .mbf .pg.home .nm{margin-top:0}
  .mbf .top .av{display:none}
}
.mbf .s{font-family:'Cormorant Garamond','Iowan Old Style',Georgia,serif}
.mbf .i{font-style:italic}
.mbf .u{text-transform:uppercase}
.mbf .c{text-align:center}
.mbf .hero{position:relative;height:40dvh;min-height:190px;background:#e7e3dd;overflow:hidden;flex:none}
.mbf .hero img{width:100%;height:100%;object-fit:cover;object-position:top}
.mbf .ini{height:100%;display:grid;place-items:center;font-size:84px;color:#9a9188}
.mbf .fade{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 58%,#FAFAFA 99%)}
.mbf .in{padding:0 28px;display:flex;flex-direction:column;align-items:stretch}
.mbf .nm{margin:-6px 0 0;position:relative;font-size:clamp(26px,3.4vh,34px);font-weight:400;letter-spacing:.06em;line-height:1.05}
.mbf .ttl{margin:6px 0 0;font-size:10.5px;letter-spacing:.2em;color:#8a8279}
.mbf .tag1{margin:clamp(8px,1.6vh,16px) 0 0;font-size:clamp(19px,2.6vh,24px);color:#6b6259;line-height:1}
.mbf .tag2{margin:4px 0 0;font-size:clamp(21px,2.8vh,26px);line-height:1.1}
.mbf .tag{margin:16px 0 0;font-size:24px;font-style:italic;line-height:1.25}
.mbf .badge{margin:14px 0 0;font-size:12px;color:#8a8279;display:flex;align-items:center;justify-content:center;gap:7px}
.mbf .badge span{width:5px;height:5px;border-radius:50%;background:#BC559E}
.mbf .btns{margin-top:clamp(14px,3vh,30px);display:flex;flex-direction:column;gap:clamp(8px,1.2vh,12px)}
.mbf .bt{display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;background:transparent;border:1px solid #2A2522;border-radius:14px;padding:clamp(9px,1.4vh,13px) 16px;color:#2A2522;cursor:pointer;font:inherit;font-family:'Cormorant Garamond','Iowan Old Style',Georgia,serif;transition:background .2s}
.mbf .bt:hover{background:#f1efec}
.mbf .bt.main{border-width:1.5px}
.mbf .bt .t1{font-size:clamp(17px,2.2vh,19px);line-height:1.2}
.mbf .bt .t2{font-size:clamp(13px,1.7vh,14px);color:#8a8279}
.mbf .bt.go{margin-top:30px;font-size:19px;padding:12px}
.mbf .bt:disabled{opacity:.4;cursor:default}
.mbf .areas{margin:clamp(14px,2.8vh,30px) 0 0;font-size:clamp(18px,2.4vh,22px);letter-spacing:.02em}
.mbf .links{margin-top:clamp(10px,1.8vh,18px);display:flex;justify-content:space-between;font-size:clamp(15px,2vh,17px)}
.mbf .dot{display:inline-flex;align-items:center;gap:8px;color:#2A2522;text-decoration:none;background:none;border:0;border-bottom:1.5px dotted #2A2522;padding:0 0 2px;font:inherit;cursor:pointer}
.mbf .dot.plain{font-size:16px}
.mbf .dot svg,.mbf .bk svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.mbf .more{margin-top:clamp(8px,1.4vh,14px);display:flex;justify-content:center;gap:22px;font-size:clamp(14px,1.9vh,16px)}
.mbf .more svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.4}
.mbf .pg.gift{padding-bottom:84px}
.mbf .claimbar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px calc(14px + env(safe-area-inset-bottom));background:#2A2522;color:#FAFAFA}
.mbf .claimbar p{margin:0;font-size:18px;font-style:italic}
.mbf .claimbar a{flex:none;font-size:18px;color:#2A2522;background:#FAFAFA;border-radius:12px;padding:8px 16px;text-decoration:none}
@media (min-width:768px){.mbf .pg.gift{padding-bottom:84px}
.mbf .claimbar{left:50%}}
.mbf .note{min-height:16px;margin:8px 0 0;font-size:12.5px;color:#93407A}
.mbf .band{margin-top:28px;background:#EFECE8;padding:18px 24px;display:grid;gap:12px;font-size:15.5px;line-height:1.5}
.mbf .band.two{grid-template-columns:1fr 1fr}
.mbf .band span{display:flex;flex-direction:column}
.mbf .band a{color:#2A2522;text-decoration:none;overflow-wrap:break-word}
.mbf .band .addr{white-space:pre-line}
.mbf .lic{margin:14px 0 0;font-size:10px;letter-spacing:.16em;color:#a39b90}
.mbf .made{display:block;margin:10px auto 14px;font-size:9px;letter-spacing:.18em;color:#b8b1a7;text-decoration:none;text-align:center}
.mbf .made:hover{color:#2A2522}
.mbf .top{display:flex;align-items:center;gap:10px;padding:18px 20px 0}
.mbf .bk{width:34px;height:34px;display:grid;place-items:center;border:0;background:none;color:#2A2522;cursor:pointer;margin-left:-8px}
.mbf .av{width:28px;height:28px;border-radius:50%;background:#e7e3dd center/cover;display:grid;place-items:center;font-size:11px;color:#8a8279;flex:none}
.mbf .av.lg{width:84px;height:84px;margin:0 auto;font-size:26px}
.mbf .tn{font-size:13px;letter-spacing:.08em}
.mbf .h{margin:34px 0 0;font-size:30px;line-height:1.1}
.mbf .sub{margin:8px 0 0;font-size:17px;color:#8a8279}
.mbf .kick{margin:34px 0 0;font-size:10.5px;letter-spacing:.2em;color:#8a8279}
.mbf .kick+.h{margin-top:10px}
.mbf .blurb{margin:18px auto 0;max-width:330px;font-size:17px;line-height:1.5;color:#4a433d}
.mbf .days{margin-top:30px;display:flex;align-items:center;justify-content:space-between;gap:4px}
.mbf .pgb{width:26px;height:40px;border:0;background:none;font-size:22px;color:#8a8279;cursor:pointer}
.mbf .pgb:disabled{opacity:.25;cursor:default}
.mbf .day{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;border:0;background:none;padding:6px 0;cursor:pointer;color:#8a8279;border-bottom:1.5px solid transparent}
.mbf .day small{font-size:14px}
.mbf .day b{font-size:22px;font-weight:400;color:#2A2522}
.mbf .day.on{border-color:#2A2522;color:#2A2522}
.mbf .day.on b{font-weight:500}
.mbf .month{margin:18px 0 0;font-size:15px;font-style:italic;color:#8a8279}
.mbf .times{margin-top:8px;display:flex;flex-direction:column;text-align:left}
.mbf .tm{display:flex;justify-content:space-between;align-items:center;border:0;border-bottom:1px solid #e2ddd6;background:none;padding:13px 4px;font:inherit;font-size:19px;color:#2A2522;cursor:pointer}
.mbf .tm .pip{font-size:10px}
.mbf .tm.on{font-weight:500}
.mbf .empty{margin:30px 0 0;font-size:17px;color:#4a433d}
.mbf .fields{margin-top:22px;display:flex;flex-direction:column}
.mbf .pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.mbf .fields input{font:inherit;font-size:18px;color:#2A2522;background:transparent;border:0;border-bottom:1px solid #cfc9c1;border-radius:0;padding:12px 2px;outline:none;min-width:0}
.mbf .fields input:focus{border-color:#2A2522}
.mbf .fields input::placeholder{color:#a39b90}
.mbf .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.mbf .lbl{margin:22px 0 8px;font-size:15px;color:#8a8279;text-align:left}
.mbf .chips{display:flex;gap:8px}
.mbf .chips button{flex:1;font:inherit;font-size:17px;padding:8px;border:1px solid #2A2522;border-radius:10px;background:transparent;color:#2A2522;cursor:pointer}
.mbf .chips button.on{background:#2A2522;color:#FAFAFA}
.mbf .err{margin:14px 0 0;font-size:13px;color:#a3322a}
.mbf .fine{margin:16px 0 26px;font-size:11.5px;color:#a39b90;line-height:1.6}
.mbf .fine a{color:#8a8279}
.mbf .mid{flex:1;justify-content:center;padding-top:40px;padding-bottom:40px}
.mbf .when{margin:16px 0 0;font-size:20px;line-height:1.4}
`
