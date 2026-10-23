"use client"

import { useEffect, useRef, useState } from "react"

// Before / after for the home page. Before is the desk as it is today; after
// is the same deal on one Marvberry page. Drag the frosted handle across.
export default function BeforeAfter() {
  const [pos, setPos] = useState(50)
  const moved = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  // One small nudge when it scrolls into view, so people see it slides.
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const steps: [number, number][] = [[400, 40], [900, 60], [1400, 50]]
        steps.forEach(([t, v]) => setTimeout(() => !moved.current && setPos(v), t))
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="ba" ref={ref}>
      <div className="ba-frame">
        <div className="ba-pane after">
          <p className="ba-tag">After</p>
          <div className="deal">
            <div className="deal-head">
              <span className="av">JT</span>
              <div>
                <p className="deal-name">Jordan Taylor</p>
                <p className="deal-sub">Buyer · Offer stage</p>
              </div>
            </div>
            <ol className="deal-track">
              <li className="d">Showing</li>
              <li className="n">Offer</li>
              <li>Closing</li>
            </ol>
            <ul className="deal-rows">
              <li><span>Showing booked</span><em>Sat 10 AM</em></li>
              <li><span>Agreement signed</span><em>From their phone</em></li>
              <li><span>Pre-approval, ID, proof of funds</span><em>All in</em></li>
              <li><span>Offer on 18 Elm Rd</span><em>Sent in minutes</em></li>
            </ul>
            <p className="deal-note">Jordan sees all of this on their own page. No texts asking where things stand.</p>
          </div>
        </div>

        <div className="ba-pane before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <p className="ba-tag">Before</p>
          <div className="desk-in" aria-label="A messy desk: a coffee-stained agreement, a scribbled calendar, a phone full of texts and a sticky note">
            <div className="paper">
              <p className="p-k">Exclusive Buyer Agreement</p>
              <p className="p-l" />
              <p className="p-l" />
              <p className="p-l s" />
              <p className="p-l" />
              <p className="p-l s" />
              <p className="p-sign">Buyer signature ____________</p>
              <span className="cring" aria-hidden />
            </div>
            <div className="cal">
              <p className="cal-k">October</p>
              <div className="cal-grid">
                {Array.from({ length: 21 }, (_, i) => (
                  <span key={i} className={i === 9 ? "x" : i === 12 ? "o" : ""}>{i + 8}</span>
                ))}
              </div>
              <p className="cal-scrawl">showing?? 10 or 11</p>
            </div>
            <div className="phone">
              <p className="ph-top">Jordan</p>
              <p className="t l">did you get my pay stubs??</p>
              <p className="t l">what time is saturday</p>
              <p className="t r">which email did you send to?</p>
              <p className="t miss">3 missed calls</p>
              <p className="t l">is the offer in yet</p>
            </div>
            <p className="sticky">call Jordan back!!<br />offer tonight</p>
          </div>
        </div>

        <div className="ba-handle" style={{ left: `${pos}%` }} aria-hidden>
          <span className="knob">
            <i>‹</i>
            <img src="/marvberry-icon.png" alt="" />
            <i>›</i>
          </span>
        </div>
        <input
          className="ba-range"
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => {
            moved.current = true
            setPos(Number(e.target.value))
          }}
          aria-label="Slide to compare before and after Marvberry"
        />
      </div>
    </div>
  )
}
