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
          ? "shrink-0 rounded-[2px] border border-lxink bg-transparent text-lxink hover:bg-lxink/[0.04] px-3 py-1.5 text-xs"
          : "text-[13px] text-lxsoft underline underline-offset-4 hover:text-lxink"
      }
    >
      {copied ? "Copied" : label}
    </button>
  )
}
