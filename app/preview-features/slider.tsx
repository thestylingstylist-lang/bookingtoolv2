"use client"

import { useEffect, useRef, useState } from "react"

// Before / after: drag the handle across. Left of it is the old way, right is Marvberry.
export default function BeforeAfter() {
  const [pos, setPos] = useState(50)
  const [moved, setMoved] = useState(false)
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
        steps.forEach(([t, v]) => setTimeout(() => setPos((p) => (moved ? p : v)), t))
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [moved])

  return (
    <div className="ba" ref={ref}>
      <div className="ba-frame">
        {/* After sits underneath, full width */}
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
              <li><span>Agreement signed</span><em>From her phone</em></li>
              <li><span>Pre-approval, ID, proof of funds</span><em>All in</em></li>
              <li><span>Offer on 18 Elm Rd</span><em>Sent in minutes</em></li>
            </ul>
            <p className="deal-note">Jordan sees all of this on her own page. No texts asking where things stand.</p>
          </div>
        </div>

        {/* Before is clipped to the handle */}
        <div className="ba-pane before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <p className="ba-tag">Before</p>
          <div className="mess">
            <p className="b l">Hey did you get my pay stubs?? I sent them last week</p>
            <p className="b r">Sorry, which email did you send to?</p>
            <p className="call">3 missed calls · Jordan</p>
            <p className="b l">What time is Saturday again</p>
            <p className="b l">Also is the offer in yet??</p>
            <p className="mail">Re: Re: Fwd: agreement (2).pdf</p>
            <p className="b r">Typing it up tonight, I promise</p>
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
            setMoved(true)
            setPos(Number(e.target.value))
          }}
          aria-label="Slide to compare doing it by hand with Marvberry"
        />
      </div>
    </div>
  )
}
