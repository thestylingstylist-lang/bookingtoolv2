"use client"

import { useActionState, useState } from "react"
import { saveShowingTimes, type TimesResult } from "./actions"
import { BTN, QUIET, HAIR } from "../../suite-ui"
import { FIRST_HOUR, LAST_HOUR, slotLabel, summaryLines, zoneLabel } from "@/lib/showing-slots"

// "Share when you're free to see homes": pick a day in the next two weeks, then tap
// the exact hours that work. Several hours, several days. All in her own time zone.

type Day = { date: string; wd: string; md: string; long: string; fromHour: number }

function nextDays(tz: string): Day[] {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
  const md = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" })
  const long = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" })
  const hourNow = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()))
  const out: Day[] = []
  for (let i = 0; out.length < 14 && i < 16; i++) {
    const d = new Date(Date.now() + i * 86400000)
    const date = key.format(d)
    if (out.some((x) => x.date === date)) continue
    // Today: only the hours still ahead, with an hour's notice.
    const fromHour = i === 0 ? Math.max(FIRST_HOUR, hourNow + 2) : FIRST_HOUR
    if (fromHour > LAST_HOUR) continue
    out.push({ date, wd: wd.format(d), md: md.format(d), long: long.format(d), fromHour })
  }
  return out
}

const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)

export default function ShowingTimes({ token, agentFirst }: { token: string; agentFirst: string }) {
  const [open, setOpen] = useState(false)
  const [tz, setTz] = useState("America/New_York")
  const [days, setDays] = useState<Day[]>([])
  const [day, setDay] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [state, action, pending] = useActionState<TimesResult | null, FormData>(saveShowingTimes, null)

  const start = () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
    const list = nextDays(zone)
    setTz(zone)
    setDays(list)
    setDay(list[0]?.date ?? "")
    setOpen(true)
  }
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
      <button type="button" onClick={start} className={BTN}>
        Pick my times
      </button>
    )

  const cur = days.find((d) => d.date === day) ?? days[0]
  const lines = summaryLines([...picked])
  const zone = zoneLabel(tz)
  const countOn = (date: string) => [...picked].filter((k) => k.startsWith(`${date}|`)).length

  return (
    <form action={action} className="mb-2 w-full min-w-0 max-w-[600px] basis-full">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tz" value={tz} />
      {[...picked].map((k) => (
        <input key={k} type="hidden" name="t" value={k} />
      ))}

      <p className="m-0 text-[12.5px] text-lxsoft">Pick a day, then tap every hour that works. Times are in {zone}.</p>

      {/* The next two weeks */}
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        {days.map((d) => {
          const on = d.date === cur?.date
          const n = countOn(d.date)
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={on}
              onClick={() => setDay(d.date)}
              className={`relative flex min-w-[58px] shrink-0 flex-col items-center rounded-[4px] border px-2 py-2 transition-colors ${on ? "border-lxink bg-lxink text-white" : "border-[rgba(31,30,28,.14)] bg-white text-lxink hover:border-lxink"}`}
            >
              <span className={`text-[11px] uppercase tracking-[.08em] ${on ? "text-white/75" : "text-lxsoft"}`}>{d.wd}</span>
              <span className="mt-0.5 text-[13.5px]">{d.md}</span>
              {n > 0 && <span aria-label={`${n} picked`} className="absolute right-1.5 top-1.5 h-[6px] w-[6px] rounded-full bg-lxgold" />}
            </button>
          )
        })}
      </div>

      {/* That day's hours */}
      {cur && (
        <div className={`mt-3 border-t ${HAIR} pt-3`}>
          <p className="m-0 text-[14px]">{cur.long}</p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {HOURS.map((h) => {
              const k = `${cur.date}|${String(h).padStart(2, "0")}`
              const on = picked.has(k)
              const gone = h < cur.fromHour
              return (
                <button
                  key={h}
                  type="button"
                  disabled={gone}
                  aria-pressed={on}
                  onClick={() => toggle(k)}
                  className={`min-h-[40px] scroll-mb-28 rounded-[4px] border md:scroll-mb-0 text-[13px] transition-colors disabled:cursor-default disabled:opacity-30 ${on ? "border-lxink bg-lxink text-white" : "border-[rgba(31,30,28,.14)] bg-white text-lxink enabled:hover:border-lxink"}`}
                >
                  {slotLabel(h)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* What she's sending, before she sends it */}
      {lines.length > 0 && (
        <div className="mt-5 border-l-2 border-lxgold pl-3.5">
          <p className="m-0 text-[11px] uppercase tracking-[.12em] text-lxsoft">Your times &middot; {zone}</p>
          {lines.map((l) => (
            <p key={l} className="m-0 mt-1.5 text-[14.5px]">
              {l}
            </p>
          ))}
        </div>
      )}

      <label className="mt-5 block text-[12px] text-lxsoft">
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
          {pending ? "Sending…" : "Send my times"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={QUIET}>
          Not now
        </button>
      </div>
    </form>
  )
}
