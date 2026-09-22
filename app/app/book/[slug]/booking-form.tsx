"use client"

import { useMemo, useState, useTransition } from "react"
import type { Slot } from "@/lib/slots"
import { createBooking } from "./actions"

export default function BookingForm({ slots, slug }: { slots: Slot[]; slug: string }) {
  const [selected, setSelected] = useState<string>("")
  const [activeDay, setActiveDay] = useState<string>(slots[0]?.dayLabel ?? "")
  const [meetingType, setMeetingType] = useState<"virtual" | "phone">("virtual")
  const [error, setError] = useState<string>("")
  const [done, setDone] = useState<boolean>(false)
  const [pending, startTransition] = useTransition()

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      if (!map.has(s.dayLabel)) map.set(s.dayLabel, [])
      map.get(s.dayLabel)!.push(s)
    }
    return Array.from(map.entries())
  }, [slots])

  const activeSlots = days.find(([d]) => d === activeDay)?.[1] ?? []

  function onSubmit(formData: FormData) {
    setError("")
    if (!selected) {
      setError("Pick a time slot to continue.")
      return
    }
    formData.set("meetingType", meetingType)
    formData.set("slotStart", selected)
    startTransition(async () => {
      const res = await createBooking(slug, formData)
      if (res.ok) setDone(true)
      else setError(res.error)
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-sage/30 bg-white/60 p-8">
        <h2 className="font-serif text-2xl">You&rsquo;re booked.</h2>
        <p className="mt-3 text-ink/70">
          Your consultation is confirmed. I&rsquo;ll be in touch at the contact you
          provided if anything changes. Talk soon.
        </p>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-sage/30 bg-white/60 p-8">
        <h2 className="font-serif text-2xl">No open times right now.</h2>
        <p className="mt-3 text-ink/70">
          There aren&rsquo;t any slots available at the moment. Please check back soon.
        </p>
      </div>
    )
  }

  return (
    <form action={onSubmit} className="space-y-10">
      <fieldset className="space-y-5">
        <legend className="font-serif text-2xl">Your details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" name="firstName" required autoComplete="given-name" />
          <Field label="Last name" name="lastName" required autoComplete="family-name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" name="phone" type="tel" required autoComplete="tel" />
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        </div>
        <p className="text-sm text-ink/50">Both are required so we can confirm your booking.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl">Consultation type</legend>
        <div className="flex gap-3">
          <Toggle checked={meetingType === "virtual"} onClick={() => setMeetingType("virtual")}>
            Virtual (video)
          </Toggle>
          <Toggle checked={meetingType === "phone"} onClick={() => setMeetingType("phone")}>
            Phone
          </Toggle>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-2xl">Pick a time</legend>
        <div className="flex flex-wrap gap-2">
          {days.map(([day]) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={
                "rounded-full border px-4 py-2 text-sm transition-colors " +
                (day === activeDay
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 text-ink/70 hover:border-ink/40")
              }
            >
              {day}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {activeSlots.map((s) => (
            <button
              key={s.startISO}
              type="button"
              onClick={() => setSelected(s.startISO)}
              aria-pressed={selected === s.startISO}
              className={
                "rounded-xl border px-3 py-3 text-sm transition-colors " +
                (selected === s.startISO
                  ? "border-brass bg-brass/10 font-medium text-ink"
                  : "border-ink/15 hover:border-brass/60")
              }
            >
              {s.timeLabel}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-ink px-6 py-4 text-base font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Booking\u2026" : "Confirm my consultation"}
      </button>
    </form>
  )
}

function Field({
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
        className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 text-base outline-none transition-colors focus:border-brass focus:ring-2 focus:ring-brass/20"
      />
    </label>
  )
}

function Toggle({
  checked,
  onClick,
  children,
}: {
  checked: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={
        "flex-1 rounded-xl border px-4 py-3 text-sm transition-colors sm:flex-none " +
        (checked ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink/70 hover:border-ink/40")
      }
    >
      {children}
    </button>
  )
}
