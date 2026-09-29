"use client"
// Watches a visit to the marketing home page: how long the tab is visible,
// how far down they scroll, how long each section is on screen, and whether
// they tap a sign-up button. Sends one snapshot every 15s and when they leave.
import { useEffect } from "react"

const SECTION_BY_CLASS: Record<string, string> = {
  hero: "hero", state: "statement", chase: "chase", portal: "portal", sign: "signature", feats: "features", "card-sec": "cards",
  bento: "bento", pricing: "pricing", faq: "faq", final: "final",
}
const ORDER = ["hero", "statement", "chase", "portal", "signature", "features", "cards", "bento", "pricing", "faq", "final"]

export default function SiteTracker() {
  useEffect(() => {
    // Team's own visits: open marvberry.com/?notrack=1 once on each device to stop counting it.
    try {
      if (new URLSearchParams(location.search).get("notrack") === "1") localStorage.setItem("mb-no-track", "1")
      if (localStorage.getItem("mb-no-track") === "1") return
    } catch {}
    if (navigator.webdriver) return

    const sid = crypto.randomUUID()
    const params = new URLSearchParams(location.search)
    const w = window.innerWidth
    const base = {
      sid,
      path: location.pathname,
      ref: document.referrer && !document.referrer.includes(location.host) ? document.referrer : "",
      utm: params.get("utm_source") ?? "",
      device: w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop",
    }

    let duration = 0
    let visibleSince = document.visibilityState === "visible" ? performance.now() : 0
    let scroll = 0
    let furthest = "hero"
    let signup = false
    const sections: Record<string, number> = {}
    const onScreenSince: Record<string, number> = {}

    const now = () => performance.now()
    const tickDuration = () => { if (visibleSince) { const t = now(); duration += t - visibleSince; visibleSince = t } }
    const tickSections = () => {
      const t = now()
      for (const k of Object.keys(onScreenSince)) { sections[k] = (sections[k] ?? 0) + (t - onScreenSince[k]); onScreenSince[k] = t }
    }

    const els = Array.from(document.querySelectorAll("section")).map((el) => {
      const name = Object.keys(SECTION_BY_CLASS).find((c) => el.classList.contains(c))
      return name ? { el, name: SECTION_BY_CLASS[name] } : null
    }).filter(Boolean) as { el: Element; name: string }[]
    const nameOf = new Map(els.map((x) => [x.el, x.name]))

    // A section counts as "being looked at" while it fills a good part of the screen.
    const io = new IntersectionObserver((entries) => {
      const t = now()
      for (const e of entries) {
        const name = nameOf.get(e.target)!
        const seen = e.isIntersecting && (e.intersectionRatio >= 0.35 || e.intersectionRect.height >= window.innerHeight * 0.35)
        if (seen && !(name in onScreenSince) && document.visibilityState === "visible") onScreenSince[name] = t
        if (!seen && name in onScreenSince) { sections[name] = (sections[name] ?? 0) + (t - onScreenSince[name]); delete onScreenSince[name] }
        if (seen && ORDER.indexOf(name) > ORDER.indexOf(furthest)) furthest = name
      }
    }, { threshold: Array.from({ length: 51 }, (_, i) => i / 50) }) // fine steps so tall sections are caught too
    els.forEach(({ el }) => io.observe(el))

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100
      if (pct > scroll) scroll = Math.min(100, pct)
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a")
      if (a && a.getAttribute("href")?.startsWith("/signup")) { signup = true; send() }
    }
    document.addEventListener("click", onClick, true)

    const send = () => {
      tickDuration(); tickSections()
      if (duration < 500) return // not a real visit (instant close, or a dev-mode remount)
      const payload = JSON.stringify({ ...base, duration, scroll, furthest, signup, sections })
      if (!navigator.sendBeacon?.("/api/track", new Blob([payload], { type: "application/json" }))) {
        fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {})
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        send()
        visibleSince = 0
        for (const k of Object.keys(onScreenSince)) delete onScreenSince[k]
      } else {
        visibleSince = now()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", send)

    const first = window.setTimeout(send, 3000)
    const every = window.setInterval(() => { if (document.visibilityState === "visible") send() }, 15000)

    return () => {
      send()
      io.disconnect()
      window.clearTimeout(first); window.clearInterval(every)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", send)
    }
  }, [])
  return null
}
