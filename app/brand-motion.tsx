"use client"
// Scroll motion for the brand home page: pieces fade up from pale as they reach the screen.
import { useEffect } from "react"

const REVEAL = [
  ".beat-inner > *", ".pivot > *", ".jobs-head h2", ".job-copy > *", ".job-pic", ".mid-cta > *",
  ".plan-band > *", ".founder-pic", ".letter > *", ".masthead > *", ".tier", ".faq h2", ".qa > div", ".closing > *", ".hire", ".total > *", ".reveal", ".value-head > *",
]

export default function BrandMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const root = document.querySelector(".mb")
    if (!root) return

    const items = Array.from(root.querySelectorAll<HTMLElement>(REVEAL.map((s) => `.mb ${s}`).join(",")))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add("in")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    )
    for (const el of items) {
      const i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0
      el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`
      el.classList.add("rv")
      io.observe(el)
    }

    return () => {
      io.disconnect()
    }
  }, [])
  return null
}
