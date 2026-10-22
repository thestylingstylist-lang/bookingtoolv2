"use client"

import { useState } from "react"

// Before / after: drag the handle across. Left of it is the old way, right is Marvberry.
export default function BeforeAfter() {
  const [pos, setPos] = useState(50)
  return (
    <div className="ba">
      <div className="ba-frame">
        {/* After sits underneath, full width */}
        <div className="ba-pane after">
          <p className="ba-tag">With Marvberry</p>
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
          <p className="ba-tag">Doing it by hand</p>
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
          <span>‹ ›</span>
        </div>
        <input
          className="ba-range"
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Slide to compare doing it by hand with Marvberry"
        />
      </div>
    </div>
  )
}
