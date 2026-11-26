"use client"

import { useActionState, useState } from "react"
import { saveShowingTimes, type TimesResult } from "./actions"
import { BTN, QUIET, HAIR } from "../../suite-ui"

// "Share when you're free to see homes": pick mornings, afternoons and evenings over
// the next two weeks, right on the next step.
const PARTS = [
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
] as const

export default function ShowingTimes({ token, days, agentFirst }: { token: string; days: { date: string; label: string }[]; agentFirst: string }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [state, action, pending] = useActionState<TimesResult | null, FormData>(saveShowingTimes, null)
  const toggle = (k: string) =>
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  if (state?.ok) return <p className="m-0 basis-full text-[14px]">Thank you. {agentFirst} has your times and will set up your viewings.</p>
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={BTN}>
        Pick my times
      </button>
    )

  return (
    <form action={action} className="mb-2 max-w-[560px] basis-full">
      <input type="hidden" name="token" value={token} />
      {[...picked].map((k) => (
        <input key={k} type="hidden" name="t" value={k} />
      ))}
      <div className={`border-t ${HAIR}`}>
        {days.map((d) => (
          <div key={d.date} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b ${HAIR} py-2.5`}>
            <span className="min-w-[110px] text-[14px]">{d.label}</span>
            <div className="flex gap-1.5">
              {PARTS.map((p) => {
                const k = `${d.date}|${p.key}`
                const on = picked.has(k)
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(k)}
                    className={`min-h-[36px] rounded-full border px-3 text-[12.5px] transition-colors ${on ? "border-lxink bg-lxink text-white" : "border-[rgba(31,30,28,.18)] bg-white text-lxink hover:border-lxink"}`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <label className="mt-4 block text-[12px] text-lxsoft">
        Anything {agentFirst} should know? Optional.
        <input
          name="note"
          maxLength={500}
          placeholder="Weekends are easiest. I work late on Tuesdays."
          className="mt-2 block w-full border-0 border-b border-[rgba(194,164,107,.55)] bg-transparent px-0 py-1.5 text-[14px] text-lxink outline-none placeholder:text-[#a5a19a]"
        />
      </label>
      {state && !state.ok && <p className="m-0 mt-3 text-[13px] text-red-800">{state.message}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button disabled={pending || picked.size === 0} className={`${BTN} disabled:opacity-40`}>
          {pending ? "Sending…" : picked.size ? `Send ${picked.size === 1 ? "this time" : `these ${picked.size} times`}` : "Send my times"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={QUIET}>
          Not now
        </button>
      </div>
    </form>
  )
}
