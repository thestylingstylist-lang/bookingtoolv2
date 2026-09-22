"use client"

import { useActionState, useRef, useState, useTransition } from "react"
import { saveSettings, removeImage, type SettingsResult } from "./actions"
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
    <form action={formAction} className="space-y-10">
      {/* ---- Your brand ---- */}
      <section className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl">Your brand</h2>
          <p className="mt-1 text-sm text-ink/60">
            This is what clients see on your booking page.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <ImageField
            kind="logo"
            label="Logo"
            hint="Wide or square. Shown at the top of your page. PNG, JPEG, WEBP or GIF, up to 5 MB."
            current={agent.logo_url}
          />
          <ImageField
            kind="headshot"
            label="Headshot"
            hint="A friendly photo of you. PNG, JPEG, WEBP or GIF, up to 5 MB."
            current={agent.headshot_url}
            round
          />
        </div>

        <Text
          label="Tagline (optional)"
          name="tagline"
          defaultValue={agent.tagline}
          placeholder="e.g. Helping first-time buyers feel at home"
        />

        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Welcome message (optional)</span>
          <textarea
            name="welcomeMessage"
            defaultValue={agent.welcome_message}
            rows={4}
            maxLength={600}
            placeholder="A short, warm note shown at the top of your booking page."
            className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <Text
            label="Public phone (optional)"
            name="publicPhone"
            type="tel"
            defaultValue={agent.public_phone}
            placeholder="Shown to clients"
          />
          <Text
            label="Public email (optional)"
            name="publicEmail"
            type="email"
            defaultValue={agent.public_email}
            placeholder="Shown to clients"
          />
        </div>
      </section>

      <hr className="border-ink/10" />

      {/* ---- Booking setup ---- */}
      <section className="space-y-8">
        <div>
          <h2 className="font-serif text-2xl">Booking setup</h2>
          <p className="mt-1 text-sm text-ink/60">Your hours and how clients can book.</p>
        </div>

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
      </section>

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

function ImageField({
  kind,
  label,
  hint,
  current,
  round,
}: {
  kind: "logo" | "headshot"
  label: string
  hint: string
  current: string
  round?: boolean
}) {
  const [preview, setPreview] = useState<string>(current)
  const [removed, setRemoved] = useState<boolean>(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = removed ? "" : preview
  const shape = round ? "rounded-2xl" : "rounded-xl"

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      setRemoved(false)
    }
  }

  function onRemove() {
    startTransition(async () => {
      await removeImage(kind)
      setRemoved(true)
      setPreview("")
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm text-ink/70">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-ink/15 bg-white/70 " +
            shape
          }
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-ink/30">None</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            name={kind}
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPick}
            className="block w-full text-sm text-ink/60 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-sm file:text-paper hover:file:opacity-90"
          />
          {shown && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="text-xs text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
            >
              {pending ? "Removing\u2026" : "Remove"}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink/50">{hint}</p>
    </div>
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
