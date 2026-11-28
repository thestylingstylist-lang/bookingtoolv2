"use client"

// Marvberry home page, v3: the charcoal New York hero, then sheets that rise and stop under the menu.
// "Protect your signature" builds the agent's real Marvberry Card and claims it in one step.
import "@fontsource/cormorant-garamond/400.css"
import "@fontsource/cormorant-garamond/400-italic.css"
import "@fontsource/cutive-mono/400.css"
import { useActionState, useEffect, useRef, useState } from "react"
import { HV3_CSS } from "./styles"
import { claimSignature, type SignatureClaim } from "./claim-actions"

const STAGES = ["Preparing", "Showing", "Offer", "Contract", "Closing"]
const NOW = 1
const COLOURS = ["#e7e3dd", "#141414", "#1f2a3a", "#2f3b30", "#5a2a2e", "#8c7040"]

const initials = (n: string) =>
  n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "YN"
const firstOf = (n: string) => n.trim().split(/\s+/)[0] || ""
// Light or dark lettering on her colour.
const darkOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l > 0.6
}

// Trim the empty margin around a logo so it sits like a mark, not a picture.
async function trim(url: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const max = 1200
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const x = c.getContext("2d")!
    x.drawImage(img, 0, 0, w, h)
    const d = x.getImageData(0, 0, w, h).data
    const bg = [d[0], d[1], d[2], d[3]]
    const same = (q: number) => (d[q + 3] < 12 && bg[3] < 12) || [0, 1, 2, 3].every((j) => Math.abs(d[q + j] - bg[j]) < 12)
    let t = h, l = w, r = -1, b = -1
    for (let y = 0; y < h; y++)
      for (let xx = 0; xx < w; xx++)
        if (!same((y * w + xx) * 4)) {
          if (y < t) t = y
          if (y > b) b = y
          if (xx < l) l = xx
          if (xx > r) r = xx
        }
    if (r < 0) return c.toDataURL("image/png")
    const o = document.createElement("canvas")
    o.width = r - l + 1
    o.height = b - t + 1
    o.getContext("2d")!.drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height)
    return o.toDataURL("image/png")
  } catch {
    return url
  }
}

export default function HomeV3({ luxury }: { luxury: boolean }) {
  const [name, setName] = useState("")
  const [logo, setLogo] = useState("")
  const [logoName, setLogoName] = useState("")
  const [color, setColor] = useState(COLOURS[0])
  const [state, claim, pending] = useActionState<SignatureClaim | null, FormData>(claimSignature, null)
  const nameRef = useRef<HTMLInputElement>(null)
  const nm = name.trim()
  const f = firstOf(nm)

  useEffect(() => {
    const $ = (id: string) => document.getElementById(id) as HTMLElement
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const root = document.querySelector(".hv3") as HTMLElement
    const px = (v: string) => parseFloat(getComputedStyle(root).getPropertyValue(v))
    const timers: number[] = []
    timers.push(window.setTimeout(() => $("hgl").classList.add("in"), still ? 0 : 1100))

    // the hero stays; the video rises over it; the slim bar sticks once it is covered
    const hin = $("hin"), art = $("art"), cue = $("hcue"), menu = $("menu"), bar = $("bar")
    function fold() {
      const H = innerHeight, y = Math.min(scrollY, H)
      if (!still) {
        hin.style.transform = `translateY(${-y * 0.12}px)`
        hin.style.opacity = String(1 - (y / H) * 0.7)
      }
      cue.style.opacity = String(Math.max(0, 1 - scrollY / 120))
      const on = scrollY >= H - px("--bar") - 1
      bar.classList.toggle("show", on)
      menu.classList.toggle("show", on)
    }

    // desktop: the city drifts a few pixels with the mouse
    let tx = 0, ty = 0, x = 0, yy = 0, run = false
    const step = () => {
      x += (tx - x) * 0.045
      yy += (ty - yy) * 0.045
      art.style.transform = `translate3d(${x.toFixed(2)}px,${yy.toFixed(2)}px,0)`
      run = Math.abs(tx - x) > 0.05 || Math.abs(ty - yy) > 0.05
      if (run) requestAnimationFrame(step)
    }
    const onMove = (e: MouseEvent) => {
      if (innerWidth <= 860 || scrollY > innerHeight) return
      tx = -(e.clientX / innerWidth - 0.5) * 16
      ty = -(e.clientY / innerHeight - 0.5) * 8
      if (!run) {
        run = true
        requestAnimationFrame(step)
      }
    }
    if (!still && matchMedia("(pointer: fine)").matches) addEventListener("mousemove", onMove, { passive: true })

    // each sheet sticks under the menu; a tall sheet scrolls to its end first
    const sheets = [...document.querySelectorAll<HTMLElement>(".hv3 .sheet")]
    function stick() {
      const head = px("--bar") + px("--menu")
      sheets.forEach((s, i) => {
        s.style.zIndex = String(10 + i)
        if (s.id !== "s3") s.style.top = Math.min(head, innerHeight - s.offsetHeight) + "px"
      })
    }

    // headlines arrive in motion
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in")
          io.unobserve(e.target)
        }
      }),
      { rootMargin: "0px 0px -12% 0px" },
    )
    document.querySelectorAll(".hv3 .mv,.hv3 .soft").forEach((el) => io.observe(el))

    // the preview keeps its proportions at any width
    function fitPreview() {
      const w = $("pvw").clientWidth, z = Math.min(1.15, w / 640)
      $("pv").style.transform = `scale(${z})`
      $("pvw").style.height = 640 * z + "px"
    }

    function layout() {
      fitPreview()
      stick()
      fold()
    }
    // a sheet that grows (an error line, a new logo) keeps sticking at the right place
    const ro = new ResizeObserver(() => stick())
    sheets.forEach((s) => ro.observe(s))
    addEventListener("scroll", fold, { passive: true })
    addEventListener("resize", layout)
    document.fonts?.ready.then(layout)
    layout()
    return () => {
      timers.forEach(clearTimeout)
      removeEventListener("scroll", fold)
      removeEventListener("resize", layout)
      removeEventListener("mousemove", onMove)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  function buildYourOwn() {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches
    const root = document.querySelector(".hv3") as HTMLElement
    const px = (v: string) => parseFloat(getComputedStyle(root).getPropertyValue(v))
    const s4 = document.getElementById("s4")!, stack = document.getElementById("stack")!
    scrollTo({ top: stack.offsetTop + s4.offsetTop - (px("--bar") + px("--menu")), behavior: still ? "auto" : "smooth" })
    setTimeout(() => nameRef.current?.focus({ preventScroll: true }), still ? 0 : 1500)
  }

  async function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !/^image\//.test(file.type)) return
    const raw = await new Promise<string>((res) => {
      const fr = new FileReader()
      fr.onload = () => res(String(fr.result))
      fr.readAsDataURL(file)
    })
    setLogo(file.type === "image/svg+xml" ? raw : await trim(raw))
    setLogoName(file.name)
  }

  function submit(fd: FormData) {
    fd.set("name", nm)
    fd.set("color", color === COLOURS[0] ? "" : color)
    // The trimmed logo, as she sees it in the preview.
    if (logo) {
      const [head, body] = logo.split(",")
      const type = /data:([^;]+)/.exec(head)?.[1] || "image/png"
      const bin = atob(body)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      fd.set("logo", new File([bytes], type === "image/svg+xml" ? "logo.svg" : "logo.png", { type }))
    }
    claim(fd)
  }

  const heroInk = darkOn(color) ? "#9a9188" : "rgba(250,250,250,.86)"

  return (
    <div className="hv3">
      <header className="top" id="top">
        <div className="art" id="art" />
        <div className="vig" />
        <div className="wm" role="img" aria-label="Marvberry" />
        <div className="house">HOUSE OF MARVBERRY</div>
        <div className="hin" id="hin">
          <h1 className="hh fadeup">Built for where you&rsquo;re going. Without losing what got you here.</h1>
          <p className="hs fadeup d2">Custom systems that run your luxury real estate business, so your mind stays with the client in front of you.</p>
          <div className="gl" id="hgl" />
          <button className="hbtn fadeup d3" type="button" onClick={buildYourOwn}>
            Build your own
          </button>
        </div>
        <div className="hcue" id="hcue" aria-hidden="true" />
      </header>

      <div className="bar" id="bar">
        <div className="bwm" role="img" aria-label="Marvberry" />
      </div>

      <nav className="menu" id="menu" aria-label="Main">
        <a href="/chat">Private fitting</a>
      </nav>

      <div className="spacer" />

      <main className="stack" id="stack">
        {/* 3 CLIENT JOURNEY */}
        <section className="sheet" id="s3">
          <div className="inner">
            <div className="vcard mv g">
              <video src="/home/client-journey.mp4" poster="/home/client-journey-poster.jpg" autoPlay muted loop playsInline preload="auto" aria-label="A client's journey in their Marvberry suite" />
            </div>
          </div>
        </section>

        {/* 4 PROTECT YOUR SIGNATURE: builds her Marvberry Card, which is her booking page */}
        <section className="sheet" id="s4">
          <div className="inner two4">
            <div className="copy">
              <h2 className="mv l">Protect your signature.</h2>
              <p className="sub2 soft">Grow without becoming generic.</p>
              <p className="body soft">Give every client an experience that&rsquo;s uniquely yours, from the first appointment to closing.</p>
              <div className="ctl soft">
                <input ref={nameRef} type="text" placeholder="Your name" aria-label="Your name" autoComplete="name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
                <label className="up">
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={pickLogo} />
                  <span>{logo ? "Upload a new logo" : "Upload logo"}</span>
                </label>
                <span className="fn">{logoName}</span>
              </div>
              <div className="sw soft" role="group" aria-label="Your colour">
                <span className="l">Your colour</span>
                {COLOURS.map((c) => (
                  <button key={c} type="button" className={color === c ? "on" : ""} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />
                ))}
                <label className="cu">
                  Custom
                  <input type="color" value={color} aria-label="Pick any colour" onChange={(e) => setColor(e.target.value)} />
                </label>
              </div>
            </div>

            <div className="pvw soft" id="pvw">
              <div className={`pv ${logo ? "has-logo" : ""}`} id="pv">
                <div className="bk" aria-label="Your Marvberry Card">
                  <div className="hero" style={{ backgroundColor: color }}>
                    <span className="ini" style={{ color: heroInk }}>{initials(nm)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo && <img src={logo} alt="" />}
                    {/* the soft fade only on the default; her colour gets a clean edge */}
                    {color === COLOURS[0] && <div className="fade" />}
                  </div>
                  <div className="in">
                    <p className="nm">{nm || "Your name"}</p>
                    <p className="ttl">Real estate agent</p>
                    <p className="t1i">Let&rsquo;s find the one</p>
                    <p className="t2i">that feels like home</p>
                    <div className="bts">
                      <div className="bt main">
                        <b>Let&rsquo;s talk about your next home</b>
                        <span>Choose a time that works for you</span>
                      </div>
                      <div className="bt">
                        <b>Not ready to book?</b>
                        <span>Leave your details and {f || "your agent"} will reach out</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="su" aria-label="Your client suite">
                  <div className="sh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {logo && <img className="slogo" src={logo} alt="" />}
                    <div className="sini">{initials(nm)}</div>
                    <div className="who">
                      <b>{nm || "Your name"}</b>
                      <small>Real estate agent</small>
                    </div>
                  </div>
                  <p className="hello">
                    Hello Sophia, <span className="nmg">{nm || "your agent"}</span> has prepared your buyer suite.
                  </p>
                  <div className="trk">
                    {STAGES.map((l, i) => (
                      <span key={l} style={{ display: "contents" }}>
                        <div className="st">
                          <div className="dot">{i < NOW ? <i /> : i === NOW ? <i className="ring" /> : <i className="todo" />}</div>
                          <span className={`lb ${i === NOW ? "now" : ""}`}>{l}</span>
                        </div>
                        {i < STAGES.length - 1 && <div className={`ln ${i < NOW ? "done" : ""}`} />}
                      </span>
                    ))}
                  </div>
                  <div className="note">
                    <div className="dd">D</div>
                    <div>
                      <p>Welcome, Sophia! I found four homes with the light you loved. Shall I book Saturday?</p>
                      <div className="sig">Diana, for {f || "your agent"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form className="claim soft" action={submit}>
              <input name="email" type="email" placeholder="Email" aria-label="Email" autoComplete="email" required />
              <input name="phone" type="tel" placeholder="Phone" aria-label="Phone" autoComplete="tel" required />
              {state?.error && <p className="err" role="alert">{state.error}</p>}
              <button type="submit" className="go" disabled={pending}>
                {pending ? "Creating your card…" : "Claim my card"}
              </button>
              <p className="fine">Your card and back office, ready now. Seven days of full access, no payment details.</p>
            </form>
          </div>
        </section>

        {/* 5 NOT EVERYTHING NEEDS YOU */}
        <section className="sheet" id="s5">
          <div className="inner two">
            <div>
              <h2 className="mv r">Not everything in your business needs you. But everything should feel like you.</h2>
              <p className="body soft">Let Marvberry handle the work between booking and closing, from client follow-ups and paperwork to appointment reminders, while you focus on the moments that require your expertise.</p>
              <a className="try soft" href="/signup">Try Diana for 7 days</a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dstill soft" src="/home/diana-chat.png" width={1620} height={1149} alt="Diana asks to follow up with a client about Saturday's showing, with a drafted message approved and sent." />
          </div>
        </section>

        {/* 6 LUXURY */}
        <section className="sheet" id="s6">
          <div className="inner center">
            <h2 className="mv g">Luxury is not just about what your clients see. It&rsquo;s how you make them feel.</h2>
            <p className="body soft">A fast reply means your client had to ask. Luxury is when they never have to. With Marvberry, you create that experience for every client, from the first appointment to closing.</p>
            {luxury && (
              <picture>
                <source media="(max-width: 860px)" srcSet="/home/luxury-phone.jpg" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="lux soft" src="/home/luxury-desktop.jpg" alt="Marvberry on an iPad, resting on a sofa" />
              </picture>
            )}
          </div>
        </section>
      </main>

      <footer>
        <a href="/privacy">Privacy policy</a>
      </footer>
      <style>{HV3_CSS}</style>
    </div>
  )
}
