"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { Slot } from "@/lib/slots"
import { createBooking } from "./actions"
import { consultationEvent, googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar"

type AgentInfo = {
  name: string
  minutes: number
  phone?: string
  email?: string
  timezone?: string
}

const SERIF = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const LOOKING_TO = ["Buy", "Sell", "Buy and sell", "Just exploring"]

const TZ_NAMES: Record<string, string> = {
  "America/New_York": "US/Canada Eastern Time",
  "America/Chicago": "US/Canada Central Time",
  "America/Denver": "US/Canada Mountain Time",
  "America/Phoenix": "Arizona Time",
  "America/Los_Angeles": "US/Canada Pacific Time",
  "America/Anchorage": "Alaska Time",
  "Pacific/Honolulu": "Hawaii Time",
}

function tzAbbr(tz: string) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")
    return part?.value ?? ""
  } catch {
    return ""
  }
}

function tzLabel(tz: string) {
  const name = TZ_NAMES[tz] ?? tz.replace(/_/g, " ")
  const abbr = tzAbbr(tz)
  return abbr ? `${name} (${abbr})` : name
}

function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(new Date(iso))
}

const dayKey = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso)
  )

const timeLabel = (iso: string, tz: string) =>
  fmt(iso, tz, { hour: "numeric", minute: "2-digit" }).replace("AM", "am").replace("PM", "pm")

type Day = { key: string; num: string; weekday: string; month: string; slots: Slot[] }

export default function BookingForm({
  slots,
  slug,
  agent,
}: {
  slots: Slot[]
  slug: string
  agent: AgentInfo
}) {
  const agentTz = agent.timezone || "America/New_York"
  const [tz, setTz] = useState(agentTz)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [activeDay, setActiveDay] = useState("")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState("")
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(7)
  const [meetingType, setMeetingType] = useState<"phone" | "virtual">("phone")
  const [lookingTo, setLookingTo] = useState("")
  const [firstName, setFirstName] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const popRef = useRef<HTMLDivElement>(null)

  // Show times in the visitor's own timezone once we know it.
  useEffect(() => {
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (local) setTz(local)
    } catch {}
  }, [])

  // Fewer date tiles on small screens.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)")
    const apply = () => setPerPage(mq.matches ? 7 : 4)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // Close the times popover on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        if (!(e.target as HTMLElement).closest("[data-day-tile]")) setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const days: Day[] = useMemo(() => {
    const map = new Map<string, Day>()
    for (const s of slots) {
      const key = dayKey(s.startISO, tz)
      if (!map.has(key)) {
        map.set(key, {
          key,
          num: fmt(s.startISO, tz, { day: "numeric" }),
          weekday: fmt(s.startISO, tz, { weekday: "short" }).toUpperCase(),
          month: fmt(s.startISO, tz, { month: "long" }),
          slots: [],
        })
      }
      map.get(key)!.slots.push(s)
    }
    return Array.from(map.values())
  }, [slots, tz])

  // Keep the active day valid when the timezone or data changes.
  useEffect(() => {
    if (!days.length) return
    if (!days.some((d) => d.key === activeDay)) setActiveDay(days[0].key)
  }, [days, activeDay])

  const pages = Math.max(1, Math.ceil(days.length / perPage))
  const safePage = Math.min(page, pages - 1)
  const visible = days.slice(safePage * perPage, safePage * perPage + perPage)
  const active = days.find((d) => d.key === activeDay)
  const activeIdx = visible.findIndex((d) => d.key === activeDay)

  function goToDay(key: string) {
    const target = days.find((d) => d.key >= key) ?? days[days.length - 1]
    if (!target) return
    const i = days.indexOf(target)
    setPage(Math.floor(i / perPage))
    setActiveDay(target.key)
    setOpen(true)
  }

  function onSubmit(formData: FormData) {
    setError("")
    if (!selected) {
      setStep(1)
      return
    }
    formData.set("meetingType", meetingType)
    formData.set("slotStart", selected)
    formData.set("lookingTo", lookingTo)
    setFirstName(String(formData.get("firstName") ?? "").trim())
    startTransition(async () => {
      const res = await createBooking(slug, formData)
      if (res.ok) setStep(3)
      else setError(res.error)
    })
  }

  const minutes = agent.minutes
  const agentFirst = (agent.name || "").split(" ")[0] || "me"
  const when = selected
    ? `${fmt(selected, tz, { weekday: "long", month: "long", day: "numeric" })} · ${timeLabel(selected, tz)} ${tzAbbr(tz)}`
    : ""

  if (slots.length === 0) {
    return (
      <div className="flex flex-col gap-3 pt-6">
        <h2 style={SERIF} className="text-4xl leading-none">No open times right now.</h2>
        <p className="text-[15px] leading-relaxed text-[#8a7872]">Please check back soon.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <Tabs step={step} canForm={!!selected} onGo={(s) => setStep(s)} />

      {step === 1 && (
        <>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col gap-3">
              <h2 style={SERIF} className="text-[40px] font-medium leading-none sm:text-[48px]">
                Consultation call
              </h2>
              <span className="flex items-center gap-2 text-[15px] text-[#8a7872]">
                <ClockIcon />
                {minutes} minutes
              </span>
            </div>
            <div className="flex flex-col gap-2.5 sm:items-end">
              <label className="relative w-fit text-sm text-[#8a7872]">
                <select
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[#8a7872] outline-none"
                  aria-label="Timezone"
                >
                  {Array.from(new Set([tz, agentTz, ...Object.keys(TZ_NAMES)])).map((z) => (
                    <option key={z} value={z}>
                      {tzLabel(z)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-0 top-0">▾</span>
              </label>
              <label className="relative flex w-fit cursor-pointer items-center gap-3 rounded-[10px] border border-[#eadbd3] bg-white px-4 py-2.5 text-[15px]">
                {active ? fmt(active.slots[0].startISO, tz, { month: "short", day: "numeric", year: "numeric" }) : ""}
                <CalendarIcon />
                <input
                  type="date"
                  aria-label="Jump to a date"
                  min={days[0]?.key}
                  max={days[days.length - 1]?.key}
                  value={activeDay}
                  onChange={(e) => e.target.value && goToDay(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p style={SERIF} className="text-[28px] leading-none">
              {visible[0]?.month}
            </p>
            <div className="relative grid grid-cols-[22px_minmax(0,1fr)_22px] items-center gap-3 border-y border-[#eadbd3] py-4 sm:gap-3.5">
              <button
                type="button"
                aria-label="Earlier dates"
                disabled={safePage === 0}
                onClick={() => {
                  setPage(safePage - 1)
                  setOpen(false)
                }}
                className="text-[#1c1a19] disabled:text-[#d6c6bf]"
              >
                <Chevron dir="left" />
              </button>

              <div
                className="grid gap-2 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}
              >
                {visible.map((d) => {
                  const isActive = d.key === activeDay
                  return (
                    <button
                      key={d.key}
                      type="button"
                      data-day-tile
                      onClick={() => {
                        if (isActive) setOpen(!open)
                        else {
                          setActiveDay(d.key)
                          setOpen(true)
                        }
                      }}
                      aria-pressed={isActive}
                      className={
                        "flex h-20 flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] transition-colors sm:h-24 " +
                        (isActive
                          ? "border-[#1c1a19] bg-[#1c1a19] text-white"
                          : "border-[#1c1a19] text-[#3d3230] hover:bg-[var(--accent-soft)]")
                      }
                    >
                      <span className="text-2xl sm:text-[30px]">{d.num}</span>
                      <span className="text-[11px] tracking-[1.5px] sm:text-xs">{d.weekday}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                aria-label="Later dates"
                disabled={safePage >= pages - 1}
                onClick={() => {
                  setPage(safePage + 1)
                  setOpen(false)
                }}
                className="text-[#1c1a19] disabled:text-[#d6c6bf]"
              >
                <Chevron dir="right" />
              </button>

              {open && active && activeIdx >= 0 && (
                <div
                  ref={popRef}
                  role="dialog"
                  aria-label={`Times on ${active.weekday} ${active.num}`}
                  className="z-20 col-span-3 flex w-full sm:absolute sm:top-[calc(100%-4px)] sm:col-span-1 flex-col gap-3 rounded-[14px] border border-[#eadbd3] bg-white p-4 shadow-[0_18px_40px_rgba(60,50,40,0.12)] sm:w-[280px] sm:p-[18px]"
                  style={
                    perPage === 7
                      ? {
                          left: `min(calc(36px + (100% - 72px + 12px) * ${activeIdx} / ${perPage}), calc(100% - 280px))`,
                        }
                      : { left: 0 }
                  }
                >
                  <div className="flex max-h-[288px] flex-col gap-3 overflow-y-auto">
                    {active.slots.map((s) => {
                      const on = selected === s.startISO
                      return (
                        <button
                          key={s.startISO}
                          type="button"
                          onClick={() => setSelected(s.startISO)}
                          aria-pressed={on}
                          className={
                            "flex h-12 shrink-0 items-center justify-center rounded-[10px] text-[15px] text-[#3d3230] transition-colors " +
                            (on
                              ? "border-[1.5px] border-[var(--accent)] bg-[var(--accent-soft)] font-medium"
                              : "border border-[#eadbd3] bg-white hover:border-[var(--accent)]")
                          }
                        >
                          {timeLabel(s.startISO, tz)}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={!selected || dayKey(selected, tz) !== active.key}
                    onClick={() => {
                      setOpen(false)
                      setStep(2)
                    }}
                    className="mt-1.5 flex h-[52px] items-center justify-center rounded-[10px] bg-[#1c1a19] text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Submit and next
                  </button>
                </div>
              )}
            </div>
            {!open && (
              <p className="text-sm text-[#8a7872]">Pick a day to see open times.</p>
            )}
          </div>
        </>
      )}

      {step === 2 && (
        <form action={onSubmit} className="flex flex-col gap-7">
          <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[var(--base)] px-5 py-4 sm:px-[22px]">
            <div className="flex flex-col gap-1">
              <span style={SERIF} className="text-[26px] leading-none">Consultation call</span>
              <span className="text-[15px] text-[#8a7872]">
                {when} · {minutes} minutes
              </span>
            </div>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-[#3d3230] underline">
              Change
            </button>
          </div>

          <div className="grid gap-x-5 gap-y-[18px] sm:grid-cols-2">
            <Field label="First name" name="firstName" placeholder="Jordan" autoComplete="given-name" required />
            <Field label="Last name" name="lastName" placeholder="Ellis" autoComplete="family-name" required />
            <Field label="Email" name="email" type="email" placeholder="you@email.com" autoComplete="email" required />
            <Field label="Phone" name="phone" type="tel" placeholder="(555) 555-0123" autoComplete="tel" required />
          </div>

          <ChipGroup label="I'm looking to" options={LOOKING_TO} value={lookingTo} onChange={setLookingTo} />

          <ChipGroup
            label="How should we talk?"
            options={["Phone call", "Video call"]}
            value={meetingType === "phone" ? "Phone call" : "Video call"}
            onChange={(v) => setMeetingType(v === "Phone call" ? "phone" : "virtual")}
            required
          />

          <label className="flex flex-col gap-2">
            <span className="text-[13px] uppercase tracking-[1px] text-[#8a7872]">
              Anything I should know? (optional)
            </span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Neighborhoods, budget, questions…"
              className="resize-none rounded-[10px] border border-[#ece5df] bg-white px-4 py-3.5 text-[15px] outline-none placeholder:text-[#b5a7a1] focus:border-[var(--accent)]"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-[10px] bg-[#fbeceb] px-4 py-3 text-sm text-[#8a2f25]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setStep(1)} className="text-[15px] text-[#8a7872]">
              ← Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-14 items-center rounded-[10px] bg-[#1c1a19] px-8 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-11"
            >
              {pending ? "Booking…" : "Book consultation"}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <Confirmed
          firstName={firstName}
          agent={agent}
          agentFirst={agentFirst}
          when={when}
          minutes={minutes}
          selected={selected}
          meetingType={meetingType}
          slug={slug}
        />
      )}
    </div>
  )
}

function Confirmed({
  firstName,
  agent,
  agentFirst,
  when,
  minutes,
  selected,
  meetingType,
  slug,
}: {
  firstName: string
  agent: AgentInfo
  agentFirst: string
  when: string
  minutes: number
  selected: string
  meetingType: "phone" | "virtual"
  slug: string
}) {
  const event = consultationEvent({
    agentName: agent.name,
    startISO: selected,
    minutes,
    meetingType,
    agentPhone: agent.phone,
    agentEmail: agent.email,
  })
  const icsHref = `/book/${slug}/ics?start=${encodeURIComponent(selected)}&type=${meetingType}`
  const calBtn =
    "flex h-12 items-center rounded-[10px] border border-[#ece5df] bg-white px-[22px] text-[15px] text-[#3d3230] transition-colors hover:border-[var(--accent)]"
  const contact = [agent.phone, agent.email].filter(Boolean)

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3.5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1a19]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 style={SERIF} className="text-[44px] font-medium leading-none sm:text-[54px]">
          You&rsquo;re booked{firstName ? ", " : "."}
          {firstName && <span className="italic">{firstName}.</span>}
        </h2>
        <p className="text-[17px] leading-relaxed text-[#8a7872]">
          I&rsquo;m looking forward to talking with you. Add it to your calendar so it doesn&rsquo;t slip.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[14px] bg-[var(--base)] px-6 py-5">
        <span style={SERIF} className="text-[26px] leading-none">
          Consultation call with {agentFirst}
        </span>
        <span className="text-[15px] text-[#8a7872]">
          {when} · {minutes} minutes · {meetingType === "phone" ? "I\u2019ll call you" : "Video call"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-1.5 w-full text-[13px] uppercase tracking-[1px] text-[#8a7872] sm:w-auto">
          Add to calendar
        </span>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={calBtn}>
          Google
        </a>
        <a href={icsHref} className={calBtn}>
          Apple
        </a>
        <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={calBtn}>
          Outlook
        </a>
      </div>

      <div className="h-px bg-[#ece5df]" />

      <div className="flex flex-col gap-4">
        <span className="text-[13px] uppercase tracking-[1px] text-[#8a7872]">What happens next</span>
        {[
          meetingType === "phone"
            ? "I\u2019ll call you at the number you gave me, right on time."
            : "I\u2019ll send you the video link before our call.",
          "Jot down any questions, neighborhoods, or homes you\u2019ve had your eye on.",
          "After we talk, I\u2019ll send your personalized next steps.",
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-4">
            <span style={SERIF} className="min-w-[22px] text-[26px] leading-none text-[var(--accent)]">
              {i + 1}
            </span>
            <span className="text-base leading-relaxed text-[#3d3230]">{t}</span>
          </div>
        ))}
      </div>

      {contact.length > 0 && (
        <p className="text-sm text-[#8a7872]">
          Need a different time? Reach me at{" "}
          {agent.phone && (
            <a href={`tel:${agent.phone}`} className="text-[#3d3230] underline">
              {agent.phone}
            </a>
          )}
          {agent.phone && agent.email && " or "}
          {agent.email && (
            <a href={`mailto:${agent.email}`} className="text-[#3d3230] underline">
              {agent.email}
            </a>
          )}
          .
        </p>
      )}
    </div>
  )
}

function Tabs({
  step,
  canForm,
  onGo,
}: {
  step: 1 | 2 | 3
  canForm: boolean
  onGo: (s: 1 | 2) => void
}) {
  const tab = (label: string, n: 1 | 2) => {
    const current = step === n
    const done = step > n
    const clickable = step !== 3 && !current && (n === 1 || canForm)
    return (
      <button
        type="button"
        disabled={!clickable}
        onClick={() => onGo(n)}
        className={
          "pb-3.5 text-[17px] font-medium " +
          (current ? "border-b-2 border-[#1c1a19] text-[#3d3230]" : "border-b border-[#ece5df] text-[#8a7872]")
        }
      >
        {label}
        {done ? " ✓" : ""}
      </button>
    )
  }
  return (
    <div className="grid grid-cols-2 text-center">
      {tab("Availability", 1)}
      {tab("Form", 2)}
    </div>
  )
}

function Field({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] uppercase tracking-[1px] text-[#8a7872]">{label}</span>
      <input
        name={name}
        {...rest}
        className="h-[52px] rounded-[10px] border border-[#ece5df] bg-white px-4 text-[15px] text-[#3d3230] outline-none placeholder:text-[#b5a7a1] focus:border-[var(--accent)]"
      />
    </label>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label={label}>
      <span className="text-[13px] uppercase tracking-[1px] text-[#8a7872]">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = value === o
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on && !required ? "" : o)}
              className={
                "flex h-11 items-center rounded-full px-5 text-[15px] text-[#3d3230] transition-colors " +
                (on
                  ? "border-[1.5px] border-[var(--accent)] bg-[var(--accent-soft)] font-medium"
                  : "border border-[#ece5df] bg-white hover:border-[var(--accent)]")
              }
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1c1a19" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1a19" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  )
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  )
}
