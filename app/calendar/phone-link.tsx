"use client"

import { useState } from "react"

// A quiet copy button. Says "Copied" for a moment, then settles back.
export function CopyButton({ value, label = "Copy", dark = false }: { value: string; label?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
      className={
        dark
          ? "shrink-0 rounded-[8px] bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90"
          : "text-[13px] text-[#5d5b62] underline underline-offset-4 hover:text-ink"
      }
    >
      {copied ? "Copied" : label}
    </button>
  )
}
