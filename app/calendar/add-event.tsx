"use client"

import { useEffect, useRef, useState } from "react"
import { EVENT_KINDS, type EventKind } from "@/lib/events"
import { addEvent } from "./actions"

const field =
  "w-full rounded-[10px] border border-[#e3e0dc] bg-white px-3 py-2 text-sm outline-none focus:border-ink/40"
const label = "mb-1.5 block text-[12px] font-medium text-[#5d5b62]"

// "Add to calendar": a small panel that drops from the button.
export default function AddEvent({
  clients,
  today,
  start,
  end,
}: {
  clients: { id: string; name: string }[]
  today: string
  start: string
  end: string
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<EventKind>("showing")
  const box = useRef<HTMLDivElement>(null)
  const meta = EVENT_KINDS.find((k) => k.key === kind)!

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
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-medium text-paper hover:opacity-90"
      >
        Add to calendar
      </button>

      {open && (
        <form
          action={addEvent}
          className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] space-y-4 rounded-2xl border border-[#e3e0dc] bg-white p-5 shadow-[0_18px_50px_rgba(22,21,26,0.14)] sm:left-auto sm:right-0"
        >
          <input type="hidden" name="kind" value={kind} />
          <div className="flex flex-wrap gap-2">
            {EVENT_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] ${
                  kind === k.key ? "border-ink bg-ink text-paper" : "border-[#e3e0dc] bg-white text-ink hover:border-ink/40"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
                {k.label}
              </button>
            ))}
          </div>

          <div>
            <label className={label} htmlFor="ev-place">{meta.placeLabel}</label>
            <input id="ev-place" name="place" placeholder={meta.placeHint} className={field} />
          </div>

          <div>
            <label className={label} htmlFor="ev-date">Day</label>
            <input id="ev-date" type="date" name="date" defaultValue={today} required className={field} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="ev-start">Starts</label>
              <input id="ev-start" type="time" name="start" defaultValue={start} required className={field} />
            </div>
            <div>
              <label className={label} htmlFor="ev-end">Ends</label>
              <input id="ev-end" type="time" name="end" defaultValue={end} required className={field} />
            </div>
          </div>

          {clients.length > 0 && (
            <div>
              <label className={label} htmlFor="ev-client">Client</label>
              <select id="ev-client" name="clientId" defaultValue="" className={field}>
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="w-full rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-medium text-paper hover:opacity-90">
            Add {meta.label.toLowerCase()}
          </button>
        </form>
      )}
    </div>
  )
}
