"use client"

import { useEffect, useRef, useState } from "react"

// Three-dots menu for a table row. Holds a single "Delete" action that
// asks for confirmation before submitting to the given server action.
export default function RowMenu({
  action,
  id,
  confirmText,
  label,
}: {
  action: (formData: FormData) => Promise<void>
  id: string
  confirmText: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  return (
    <div ref={box} className="relative inline-flex">
      <button
        type="button"
        aria-label={`More options for ${label}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/50 hover:bg-ink/5 hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && (
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(confirmText)) e.preventDefault()
          }}
          className="absolute right-full top-1/2 z-20 mr-1 -translate-y-1/2"
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50"
          >
            Delete
          </button>
        </form>
      )}
    </div>
  )
}
