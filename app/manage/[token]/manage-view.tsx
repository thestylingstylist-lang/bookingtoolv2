"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type { Slot } from "@/lib/slots"
import { rescheduleBooking, cancelBooking } from "./actions"
import { BTN, QUIET, HAIR } from "../../suite-ui"

function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(new Date(iso))
}
function tzAbbr(tz: string) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    )
  } catch {
    return ""
  }
}
const timeLabel = (iso: string, tz: string) =>
  fmt(iso, tz, { hour: "numeric", minute: "2-digit" }).replace("AM", "am").replace("PM", "pm")
const longWhen = (iso: string, tz: string) =>
  `${fmt(iso, tz, { weekday: "long", month: "long", day: "numeric" })} · ${timeLabel(iso, tz)} ${tzAbbr(tz)}`
const dayKey = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso)
  )

type Day = { key: string; num: string; weekday: string; month: string; slots: Slot[] }
type Mode = "home" | "pick" | "cancel" | "moved" | "cancelled"

export default function ManageView({
  token,
  slots,
  current,
  firstName,
  meetingType,
  agentName,
  agentTz,
  minutes,
  bookUrl,
}: {
  token: string
  slots: Slot[]
  current: string
  firstName: string
  meetingType: string
  agentName: string
  agentTz: string
  minutes: number
  bookUrl: string
}) {
  const [tz, setTz] = useState(agentTz || "America/New_York")
  const [mode, setMode] = useState<Mode>("home")
  const [activeDay, setActiveDay] = useState("")
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(7)
  const [selected, setSelected] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (local) setTz(local)
    } catch {}
    const mq = window.matchMedia("(min-width: 640px)")
    const apply = () => setPerPage(mq.matches ? 7 : 4)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const days: Day[] = useMemo(() => {
    const map = new Map<string, Day>()
    for (const s of slots) {
      const key = dayKey(s.startISO, tz)
      if (!map.has(key))
        map.set(key, {
          key,
          num: fmt(s.startISO, tz, { day: "numeric" }),
          weekday: fmt(s.startISO, tz, { weekday: "short" }).toUpperCase(),
          month: fmt(s.startISO, tz, { month: "long" }),
          slots: [],
        })
      map.get(key)!.slots.push(s)
    }
    return Array.from(map.values())
  }, [slots, tz])

  useEffect(() => {
    if (days.length && !days.some((d) => d.key === activeDay)) setActiveDay(days[0].key)
  }, [days, activeDay])

  const pages = Math.max(1, Math.ceil(days.length / perPage))
  const safePage = Math.min(page, pages - 1)
  const visible = days.slice(safePage * perPage, safePage * perPage + perPage)
  const active = days.find((d) => d.key === activeDay)
  const agentFirst = agentName.split(" ")[0] || "your agent"
  const type = meetingType === "phone" ? "Phone call" : "Video call"

  function confirmMove() {
    if (!selected) return
    setError("")
    startTransition(async () => {
      const res = await rescheduleBooking(token, selected)
      if (res.ok) setMode("moved")
      else setError(res.error)
    })
  }

  function confirmCancel() {
    setError("")
    startTransition(async () => {
      const res = await cancelBooking(token)
      if (res.ok) setMode("cancelled")
      else setError(res.error)
    })
  }

  const blackBtn = BTN
  const quietBtn = QUIET
  const h1 = "m-0 font-lux text-[38px] font-light leading-[1.08] sm:text-[44px]"
  const lede = "m-0 text-[14px] leading-relaxed text-lxsoft"

  const summary = (iso: string) => (
    <div className={`border-y ${HAIR} py-[22px]`}>
      <p className="m-0 font-lux text-[24px]">Consultation call with {agentFirst}</p>
      <p className="m-0 mt-2 text-[13px] leading-relaxed text-lxsoft">
        {longWhen(iso, tz)}
        <br />
        {minutes} minutes &middot; {type}
      </p>
    </div>
  )

  const errorBox = error && (
    <p role="alert" className="m-0 border-l-2 border-lxblush pl-3 text-[13.5px] text-lxink">
      {error}
    </p>
  )

  if (mode === "moved") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={h1}>
          You&rsquo;re all set{firstName ? ", " : "."}
          {firstName && <span>{firstName}.</span>}
        </h1>
        <p className={lede}>Your call has been moved. A confirmation is on its way to your inbox.</p>
        {summary(selected)}
      </div>
    )
  }

  if (mode === "cancelled") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={h1}>Your call is cancelled.</h1>
        <p className={lede}>
          We&rsquo;ve let {agentFirst} know. Whenever you&rsquo;d like to talk, you&rsquo;re welcome to book again.
        </p>
        <a href={bookUrl} className={`${blackBtn} w-fit`}>
          Book a new time
        </a>
      </div>
    )
  }

  if (mode === "cancel") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className={h1}>Cancel this call?</h1>
        {summary(current)}
        {errorBox}
        <div className="flex flex-wrap items-center gap-5">
          <button type="button" onClick={confirmCancel} disabled={pending} className={blackBtn}>
            {pending ? "Cancelling\u2026" : "Yes, cancel it"}
          </button>
          <button type="button" onClick={() => setMode("home")} className={quietBtn}>
            Keep my booking
          </button>
        </div>
      </div>
    )
  }

  if (mode === "pick") {
    return (
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h1 className={h1}>Choose a new time</h1>
          <p className="m-0 text-[13px] text-lxsoft">Times shown in {tzAbbr(tz) || tz}.</p>
        </div>

        {days.length === 0 ? (
          <p className={lede}>There are no other open times just now. Please check back soon.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="m-0 font-lux text-[24px] italic">{visible[0]?.month}</p>
            <div className={`grid grid-cols-[22px_minmax(0,1fr)_22px] items-center gap-2.5 border-y ${HAIR} py-4`}>
              <button
                type="button"
                aria-label="Earlier dates"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="text-lxink disabled:text-[rgba(31,30,28,.25)]"
              >
                <Chevron dir="left" />
              </button>
              <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
                {visible.map((d) => {
                  const on = d.key === activeDay
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setActiveDay(d.key)}
                      aria-pressed={on}
                      className={
                        "flex h-[72px] flex-col items-center justify-center gap-1 rounded-[2px] border text-lxink transition-colors " +
                        (on ? "border-lxink bg-lxblue" : "border-[rgba(31,30,28,.2)] hover:border-lxink")
                      }
                    >
                      <span className="font-lux text-[24px]">{d.num}</span>
                      <span className="text-[10px] tracking-[1.4px]">{d.weekday}</span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                aria-label="Later dates"
                disabled={safePage >= pages - 1}
                onClick={() => setPage(safePage + 1)}
                className="text-lxink disabled:text-[rgba(31,30,28,.25)]"
              >
                <Chevron dir="right" />
              </button>
            </div>

            {active && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {active.slots.map((s) => {
                  const on = selected === s.startISO
                  return (
                    <button
                      key={s.startISO}
                      type="button"
                      onClick={() => setSelected(s.startISO)}
                      aria-pressed={on}
                      className={
                        "flex h-[46px] items-center justify-center rounded-[2px] border text-[14px] text-lxink transition-colors " +
                        (on ? "border-lxgold bg-lxblue" : "border-[rgba(31,30,28,.09)] bg-white hover:border-lxgold")
                      }
                    >
                      {timeLabel(s.startISO, tz)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selected && (
          <p className="m-0 text-[14px]">
            New time: <span className="font-lux text-[17px]">{longWhen(selected, tz)}</span>
          </p>
        )}
        {errorBox}
        <div className="flex flex-wrap items-center gap-5">
          <button type="button" onClick={confirmMove} disabled={!selected || pending} className={blackBtn}>
            {pending ? "Moving\u2026" : "Confirm new time"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected("")
              setError("")
              setMode("home")
            }}
            className={quietBtn}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h1 className={h1}>
          Your booking{firstName ? ", " : ""}
          {firstName && <span>{firstName}</span>}
        </h1>
        <p className={lede}>If your plans have changed, choose a new time or cancel below.</p>
      </div>
      {summary(current)}
      <div className="flex flex-wrap items-center gap-5">
        <button type="button" onClick={() => setMode("pick")} className={blackBtn}>
          Choose a new time
        </button>
        <button type="button" onClick={() => setMode("cancel")} className={quietBtn}>
          Cancel booking
        </button>
      </div>
    </div>
  )
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  )
}
