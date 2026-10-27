"use client"
// Retargeting pixels (Meta and Reddit) for Marvberry's public pages only:
// the home page, signup, and the setup call page. Never inside the app or on client pages.
// They stay off when: an ID below is empty, the visitor opted out on /privacy#choices,
// their browser sends Global Privacy Control, it's our own team (?notrack=1), or it's a bot.
import { useEffect } from "react"

// Paste the IDs from Meta Events Manager and Reddit Ads here.
const META_PIXEL_ID = ""
const REDDIT_PIXEL_ID = ""

export const OPT_OUT_KEY = "mb-no-ads"

type Win = Window & { fbq?: (...a: unknown[]) => void; _fbq?: unknown; rdt?: (...a: unknown[]) => void }

export function adsAllowed() {
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false
    if (navigator.webdriver) return false
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return false
    if (localStorage.getItem("mb-no-track") === "1") return false
    if (new URLSearchParams(location.search).get("notrack") === "1") return false
  } catch {}
  return true
}

function loadMeta(id: string) {
  const w = window as Win
  if (w.fbq) return
  const q: unknown[][] = []
  const fbq = (...a: unknown[]) => {
    const f = fbq as unknown as { callMethod?: (...a: unknown[]) => void }
    if (f.callMethod) f.callMethod(...a)
    else q.push(a)
  }
  Object.assign(fbq, { push: fbq, loaded: true, version: "2.0", queue: q })
  w.fbq = fbq
  w._fbq = fbq
  const s = document.createElement("script")
  s.async = true
  s.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(s)
  w.fbq("init", id)
}

function loadReddit(id: string) {
  const w = window as Win
  if (w.rdt) return
  const q: unknown[][] = []
  const rdt = (...a: unknown[]) => {
    const r = rdt as unknown as { sendEvent?: (...a: unknown[]) => void }
    if (r.sendEvent) r.sendEvent(...a)
    else q.push(a)
  }
  Object.assign(rdt, { callQueue: q })
  w.rdt = rdt
  const s = document.createElement("script")
  s.async = true
  s.src = "https://www.redditstatic.com/ads/pixel.js"
  document.head.appendChild(s)
  w.rdt("init", id)
}

// event: "signup" fires once when a new agent lands on step two (their account was just created).
export default function AdPixels({ event }: { event?: "signup" }) {
  useEffect(() => {
    if (!META_PIXEL_ID && !REDDIT_PIXEL_ID) return
    if (!adsAllowed()) return
    const w = window as Win
    if (META_PIXEL_ID) {
      loadMeta(META_PIXEL_ID)
      w.fbq?.("track", "PageView")
      if (event === "signup") w.fbq?.("track", "CompleteRegistration")
    }
    if (REDDIT_PIXEL_ID) {
      loadReddit(REDDIT_PIXEL_ID)
      w.rdt?.("track", "PageVisit")
      if (event === "signup") w.rdt?.("track", "SignUp")
    }
  }, [event])
  return null
}
