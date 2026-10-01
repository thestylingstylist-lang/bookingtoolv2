"use client"
// Microsoft Clarity — session recordings + heatmaps for the marketing home page only.
// Mounted from app/page.tsx (never from the root layout), so it never loads on the
// agent dashboard or the client portal, where client data must not be recorded.
import { useEffect } from "react"

const PROJECT_ID = "yqxr401891"

export default function Clarity() {
  useEffect(() => {
    try {
      // Don't record the team's own visits: marvberry.com/?notrack=1 once per device.
      if (new URLSearchParams(location.search).get("notrack") === "1") localStorage.setItem("mb-no-track", "1")
      if (localStorage.getItem("mb-no-track") === "1") return
    } catch {}
    if (navigator.webdriver) return
    if (document.getElementById("mb-clarity")) return
    const s = document.createElement("script")
    s.id = "mb-clarity"
    s.async = true
    s.src = "https://www.clarity.ms/tag/" + PROJECT_ID
    document.head.appendChild(s)
  }, [])
  return null
}
