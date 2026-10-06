"use client"

import { useActionState, useState } from "react"
import { saveAgreement, type SettingsResult } from "./actions"
import { AGREEMENT_LENGTHS, lengthLabel, type AgreementSettings } from "@/lib/agreement"

const pill = (on: boolean) =>
  "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors " +
  (on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/70 text-ink/70 hover:border-ink/40")

export default function AgreementForm({ initial }: { initial: AgreementSettings }) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(
    saveAgreement,
    null
  )
  const [days, setDays] = useState(initial.days)
  const [exclusive, setExclusive] = useState(initial.exclusive)

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <span className="mb-2 block text-sm text-ink/70">How long your agreements run</span>
        <div className="flex flex-wrap gap-2">
          {AGREEMENT_LENGTHS.map((d) => (
            <label key={d} className={pill(days === d)}>
              <input
                type="radio"
                name="days"
                value={d}
                checked={days === d}
                onChange={() => setDays(d)}
                className="sr-only"
              />
              {lengthLabel(d)}
            </label>
          ))}
        </div>
        <span className="mt-1.5 block text-xs text-ink/50">
          The end date counts forward from the day you send it.
        </span>
      </div>

      <div>
        <span className="mb-2 block text-sm text-ink/70">Agreement type</span>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "yes", label: "Exclusive", on: exclusive },
            { v: "no", label: "Non-exclusive", on: !exclusive },
          ].map((o) => (
            <label key={o.v} className={pill(o.on)}>
              <input
                type="radio"
                name="exclusive"
                value={o.v}
                checked={o.on}
                onChange={() => setExclusive(o.v === "yes")}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      {state && (
        <p
          role="status"
          className={
            "rounded-lg px-4 py-3 text-sm " +
            (state.ok ? "bg-sage/15 text-ink/80" : "bg-red-50 text-red-800")
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ox px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save agreement"}
      </button>
    </form>
  )
}
