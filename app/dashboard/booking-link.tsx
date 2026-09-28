"use client"

import { useState } from "react"

export default function BookingLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const url = `https://www.marvberry.com/book/${slug}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; the link is still visible to copy by hand */
    }
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <a
        href={`/book/${slug}`}
        className="truncate font-medium text-brass hover:underline"
      >
        {url}
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
