"use client"

import { useState } from "react"

// A due date that reads as words, not a mm/dd/yyyy box. Tapping it opens the
// native date picker. In a row it saves the moment a date is picked.
export default function DuePicker({
  value,
  label,
  empty,
  submitOnChange = false,
  strong = false,
  late = false,
}: {
  value?: string | null
  label?: string
  empty: string
  submitOnChange?: boolean
  strong?: boolean
  late?: boolean
}) {
  const [picked, setPicked] = useState(value ?? "")
  const shown = submitOnChange
    ? label || empty
    : picked
      ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
          new Date(`${picked}T12:00:00Z`)
        )
      : empty

  return (
    <span
      className={`relative inline-flex cursor-pointer items-center gap-1 text-xs ${
        late ? "font-medium text-[#c23d6d]" : strong ? "font-medium text-ink" : "text-[#5d5b62]"
      } hover:text-ink`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      <span className={picked || label ? "" : "underline decoration-dotted underline-offset-2"}>{shown}</span>
      <input
        type="date"
        name="due"
        value={picked}
        aria-label={empty}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {}
        }}
        onChange={(e) => {
          setPicked(e.target.value)
          if (submitOnChange) e.currentTarget.form?.requestSubmit()
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  )
}
