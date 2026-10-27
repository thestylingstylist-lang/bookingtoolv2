"use client"
// "Your privacy choices": turn off ad tracking (the Meta and Reddit pixels) on this browser.
import { useEffect, useState } from "react"
import { OPT_OUT_KEY } from "@/app/ad-pixels"

export default function Choices() {
  const [off, setOff] = useState(false)
  const [gpc, setGpc] = useState(false)
  useEffect(() => {
    try {
      setOff(localStorage.getItem(OPT_OUT_KEY) === "1")
    } catch {}
    setGpc(!!(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl)
  }, [])
  const toggle = () => {
    const next = !off
    try {
      if (next) localStorage.setItem(OPT_OUT_KEY, "1")
      else localStorage.removeItem(OPT_OUT_KEY)
    } catch {}
    setOff(next)
  }
  if (gpc)
    return (
      <p className="callout">
        Your browser sends a Global Privacy Control signal, so ad tracking is already off for you.
      </p>
    )
  return (
    <div className="choice">
      <p>
        <strong>Ad tracking on this browser:</strong> {off ? "Off" : "On"}
      </p>
      <button type="button" onClick={toggle} className="choice-btn">
        {off ? "Turn ad tracking back on" : "Opt out of ad tracking"}
      </button>
    </div>
  )
}
