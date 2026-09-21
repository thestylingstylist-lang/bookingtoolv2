"use client"

import { useActionState } from "react"
import { saveSettings, type SettingsResult } from "./actions"
import { TIMEZONES, WEEKDAY_LABELS } from "@/lib/config"
import type { AgentRow } from "@/lib/agent"

const HOURS = Array.from({ length: 25 }, (_, i) => i)
const label = (h: number) =>
  h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : h === 24 ? "12 AM" : `${h - 12} PM`

export default function SettingsForm({ agent }: { agent: AgentRow }) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(
    saveSettings,
    null
  )

  return (
    <form action={formAction} className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Text label="Business name" name="businessName" defaultValue={agent.business_name} required />
        <Text label="Your name" name="fullName" defaultValue={agent.full_name} />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">Timezone</span>
        <select
          name="timezone"
          defaultValue={agent.timezone}
          className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace("America/", "").replace("Pacific/", "").replace("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-ink/70">Working days</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map(({ iso, label }) => (
            <label key={iso} className="cursor-pointer">
              <input
                type="checkbox"
                name="weekdays"
                value={iso}
                defaultChecked={agent.weekdays.includes(iso)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-ink/20 px-4 py-2 text-sm text-ink/70 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Day starts" name="dayStart" defaultValue={agent.day_start}>
          {HOURS.slice(0, 24).map((h) => (
            <option key={h} value={h}>{label(h)}</option>
          ))}
        </Select>
        <Select label="Day ends" name="dayEnd" defaultValue={agent.day_end}>
          {HOURS.slice(1).map((h) => (
            <option key={h} value={h}>{label(h)}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Slot length" name="slotMinutes" defaultValue={agent.slot_minutes}>
          {[15, 30, 45, 60].map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </Select>
        <Text
          label="Booking window (days ahead)"
          name="daysAhead"
          type="number"
          min={1}
          max={60}
          defaultValue={String(agent.days_ahead)}
        />
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
        className="rounded-xl bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save settings"}
      </button>
    </form>
  )
}

function Text({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink/70">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
      />
    </label>
  )
}

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue: number
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink/70">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass"
      >
        {children}
      </select>
    </label>
  )
}
