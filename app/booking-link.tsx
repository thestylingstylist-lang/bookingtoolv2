"use client"

import { useEffect, useState } from "react"

export default function BookingLink({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => setOrigin(window.location.origin), [])
  const url = `${origin}/book/${slug}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; the link is still visible to copy by hand */
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg border border-ink/20 px-4 py-2 text-sm font-medium text-ink/80 transition-colors hover:border-ink/40"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
        {copied ? "Copied" : "Copy booking link"}
      </button>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <a
        href={`/book/${slug}`}
        className="truncate font-medium text-brass hover:underline"
      >
        {origin ? url : `/book/${slug}`}
      </a>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-ink/20 px-3 py-1.5 text-xs text-ink/70 hover:border-ink/40"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
