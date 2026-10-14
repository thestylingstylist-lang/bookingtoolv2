"use client"

import { useEffect } from "react"
import { SEEN_COOKIE, AWAY_MS } from "@/lib/whats-new-shared"

// Remembers when she last looked, so "while you were away" only covers what's
// new since then. Within one sitting (under 30 minutes apart) the news stays put.
export default function SeenMarker({ since }: { since: number }) {
  useEffect(() => {
    const now = Date.now()
    const raw = document.cookie.split("; ").find((c) => c.startsWith(SEEN_COOKIE + "="))?.split("=")[1]
    const [s, a] = (raw ? decodeURIComponent(raw) : "").split("|").map(Number)
    const nextSince = a && now - a <= AWAY_MS ? s || since : a || since
    document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(`${nextSince}|${now}`)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`
  }, [since])
  return null
}
