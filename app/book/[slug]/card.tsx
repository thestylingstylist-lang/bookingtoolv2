"use client"

// The Marvberry Card: the agent's editorial card at the top of their booking page.
// Book is the main action. Save contact, Share and the guide (or "Contact me")
// sit quietly under it. Every tap answers back.
import { useEffect, useState } from "react"
import { logCardEvent, requestContact } from "./card-actions"

type Props = {
  slug: string
  name: string
  initials: string
  title: string
  line: string
  photo: string
  phone: string
  email: string
  badge: string
  guideTitle: string
  fine: string[]
}

const SERIF = { fontFamily: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif" }

export default function Card(p: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [err, setErr] = useState("")
  const [done, setDone] = useState(false)
  const [inApp, setInApp] = useState(false)
  const first = p.name.split(" ")[0] || "I"

  useEffect(() => {
    setInApp(/Instagram|FBAN|FBAV|LinkedInApp|TikTok/i.test(navigator.userAgent))
    const key = `mb-viewed-${p.slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {}
    logCardEvent(p.slug, "view").catch(() => {})
  }, [p.slug])

  async function share() {
    const url = `${location.origin}/book/${p.slug}`
    logCardEvent(p.slug, "share").catch(() => {})
    try {
      if (navigator.share) {
        await navigator.share({ title: p.name, text: `${p.name}, real estate agent`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setNote("Link copied. Paste it anywhere to share.")
    } catch {}
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setErr("")
    const r = await requestContact(p.slug, new FormData(e.currentTarget)).catch(() => ({ ok: false as const, error: "That didn’t go through. Try again." }))
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    setDone(true)
    setOpen(false)
    setNote(r.guide ? `On its way to your inbox. ${first} will reach out soon.` : `Got it. ${first} will reach out soon.`)
  }

  return (
    <div className="mbc">
      <div className="ph">
        {p.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo} alt={p.name} />
        ) : (
          <div className="ini" style={SERIF} aria-hidden>{p.initials}</div>
        )}
        <div className="fade">
          <h1 style={SERIF}>{p.name}</h1>
          {p.title && <p className="tt">{p.title}</p>}
        </div>
      </div>

      <div className="bd">
        <p className="line" style={SERIF}>{p.line}</p>
        {p.badge && (
          <p className="badge"><span aria-hidden />{p.badge}</p>
        )}

        <button type="button" className="book" onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth" })}>
          Book a time to talk
        </button>

        {!done && !open && (
          <button type="button" className="ask" onClick={() => setOpen(true)}>
            <span>
              <b style={SERIF}>{p.guideTitle || "Not ready to book?"}</b>
              <small>{p.guideTitle ? "Free. Sent to your inbox." : `Leave your details and ${first} will reach out.`}</small>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        )}

        {open && (
          <form className="form" onSubmit={submit}>
            <input type="hidden" name="guide" value={p.guideTitle ? "1" : ""} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
            <input name="name" placeholder="Your name" autoComplete="name" required />
            <input name="email" type="email" placeholder="Email" autoComplete="email" required />
            <input name="phone" type="tel" placeholder="Phone (optional)" autoComplete="tel" />
            {!p.guideTitle && <textarea name="message" rows={2} placeholder="What are you looking for?" />}
            {err && <p className="err">{err}</p>}
            <div className="row">
              <button type="button" className="ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="send" disabled={busy}>{busy ? "Sending…" : p.guideTitle ? "Send me the guide" : "Ask to be contacted"}</button>
            </div>
            <p className="small">By sending, you agree {first} can contact you.</p>
          </form>
        )}

        <div className="links">
          <a href={`/book/${p.slug}/contact`} onClick={() => setNote("Saved. Open the download to add it to your contacts.")}>
            Save contact
            <svg viewBox="0 0 24 24" aria-hidden><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
          </a>
          <button type="button" onClick={share}>
            Share
            <svg viewBox="0 0 24 24" aria-hidden><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>
          </button>
        </div>
        <p className="note" role="status">{note || (inApp ? "To save the contact, open this page in your browser." : "")}</p>

        {(p.phone || p.email) && (
          <div className="contact">
            {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
            {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
          </div>
        )}
        {p.fine.length > 0 && <p className="fine">{p.fine.join(" · ")}</p>}

        <a className="made" href="https://marvberry.com/?ref=card">Made with Marvberry · Get your card</a>
      </div>

      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
.mbc{color:#2A2522;background:#F4F1EA}
.mbc .ph{position:relative;height:min(68vh,560px);min-height:420px;background:#d9d3c9;overflow:hidden}
.mbc .ph img{width:100%;height:100%;object-fit:cover;object-position:top}
.mbc .ini{height:100%;display:grid;place-items:center;font-size:84px;color:#8c8378}
.mbc .fade{position:absolute;inset:auto 0 0 0;padding:120px 28px 26px;background:linear-gradient(to top,rgba(24,20,18,.72),rgba(24,20,18,.32) 55%,transparent)}
.mbc h1{margin:0;font-size:38px;line-height:1.02;font-weight:400;color:#fff;letter-spacing:.01em}
.mbc .tt{margin:10px 0 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f3eee6}
.mbc .bd{padding:34px 28px 30px}
.mbc .line{margin:0;font-size:22px;line-height:1.35;font-style:italic}
.mbc .badge{margin:16px 0 0;font-size:12.5px;color:#6f675e;display:flex;align-items:center;gap:8px}
.mbc .badge span{width:6px;height:6px;border-radius:50%;background:#BC559E}
.mbc .book{margin-top:30px;width:100%;height:54px;border:0;border-radius:2px;background:#2A2522;color:#F4F1EA;font:inherit;font-size:12.5px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer}
.mbc .book:hover{background:#16151a}
.mbc .ask{margin-top:14px;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;border:0;border-bottom:1px solid #cfc7bc;background:none;padding:16px 2px;font:inherit;color:inherit;cursor:pointer}
.mbc .ask b{display:block;font-size:18px;font-weight:400}
.mbc .ask small{display:block;margin-top:4px;font-size:12.5px;color:#7a7268}
.mbc svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.mbc .form{margin-top:16px;display:flex;flex-direction:column;gap:8px}
.mbc .form input,.mbc .form textarea{font:inherit;font-size:15px;color:#2A2522;background:#fff;border:1px solid #d6cfc4;border-radius:2px;padding:12px;outline:none;resize:none}
.mbc .form input:focus,.mbc .form textarea:focus{border-color:#2A2522}
.mbc .form .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.mbc .row{display:flex;gap:8px}
.mbc .row button{flex:1;height:46px;border-radius:2px;font:inherit;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.mbc .ghost{background:none;border:1px solid #cfc7bc;color:#2A2522}
.mbc .send{background:#2A2522;border:0;color:#F4F1EA}
.mbc .send:disabled{opacity:.6}
.mbc .err{margin:0;font-size:13px;color:#a3322a}
.mbc .small{margin:2px 0 0;font-size:11.5px;color:#8d857b}
.mbc .links{margin-top:28px;display:flex;justify-content:space-between}
.mbc .links a,.mbc .links button{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#2A2522;background:none;border:0;border-bottom:1px solid #2A2522;padding:0 0 4px;cursor:pointer;text-decoration:none}
.mbc .links svg{width:15px;height:15px}
.mbc .note{min-height:18px;margin:12px 0 0;font-size:12.5px;color:#93407A}
.mbc .contact{margin-top:30px;display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.6}
.mbc .contact a{color:#4a433d;text-decoration:none}
.mbc .contact a:hover{color:#2A2522}
.mbc .fine{margin:10px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8d857b;line-height:1.7}
.mbc .made{display:block;margin-top:40px;text-align:center;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#a39b90;text-decoration:none}
.mbc .made:hover{color:#2A2522}
@media (min-width:1024px){.mbc{min-height:100vh}.mbc .ph{height:62vh;min-height:460px}}
`
