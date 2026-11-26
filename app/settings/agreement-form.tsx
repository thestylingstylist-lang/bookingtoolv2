"use client"

import { useActionState, useState } from "react"
import { saveAgreement, type SettingsResult } from "./actions"
import { AGREEMENT_LENGTHS, lengthLabel, type AgreementSettings } from "@/lib/agreement"

const pill = (on: boolean) =>
  "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors " +
  (on ? "border-lxink bg-lxink text-lxbg" : "border-lxink/15 bg-white/70 text-lxink/70 hover:border-lxink/40")

export default function AgreementForm({
  initial,
  commission = "",
  broker = { name: "", email: "" },
}: {
  initial: AgreementSettings
  commission?: string
  broker?: { name: string; email: string }
}) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(
    saveAgreement,
    null
  )
  const [days, setDays] = useState(initial.days)
  const [exclusive, setExclusive] = useState(initial.exclusive)

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <span className="mb-2 block text-sm text-lxink/70">How long your agreements run</span>
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
        <span className="mt-1.5 block text-xs text-lxink/50">
          The end date counts forward from the day you send it.
        </span>
      </div>

      <div>
        <span className="mb-2 block text-sm text-lxink/70">Agreement type</span>
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

      <label className="block">
        <span className="mb-1.5 block text-sm text-lxink/70">Your usual commission</span>
        <input
          name="commission"
          defaultValue={commission}
          placeholder="2%"
          maxLength={40}
          className="w-full max-w-[12rem] rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
        />
        <span className="mt-1.5 block text-xs text-lxink/50">
          It fills in on every agreement you send. You can still change it for any client.
        </span>
      </label>

      <div>
        <span className="mb-1.5 block text-sm text-lxink/70">Your broker</span>
        <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="brokerName"
            defaultValue={broker.name}
            placeholder="Broker's name"
            maxLength={120}
            autoComplete="off"
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
          />
          <input
            name="brokerEmail"
            type="email"
            defaultValue={broker.email}
            placeholder="Broker's email"
            maxLength={200}
            autoComplete="off"
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
          />
        </div>
        <span className="mt-1.5 block text-xs text-lxink/50">
          Your broker co-signs after you, and your client gets the agreement once both signatures are on it. Leave blank if no one co-signs.
        </span>
      </div>

      {state && (
        <p
          role="status"
          className={
            "rounded-lg px-4 py-3 text-sm " +
            (state.ok ? "bg-lxgold/15 text-lxink/80" : "bg-red-50 text-red-800")
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-lxink px-6 py-3 font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save agreement"}
      </button>
    </form>
  )
}
