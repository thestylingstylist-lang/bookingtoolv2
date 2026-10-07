import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import { CONSULT_COLOR, EVENT_KINDS } from "@/lib/events"

export type WeekItem = { id: string; start: Date; end: Date; color: string; title: string; tag: string; href?: string }
export type WeekDue = { id: string; label: string; late: boolean; href: string; day: string }

const HOUR = 58 // px per hour
const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// A pale wash of the event's own color.
const tint = (hex: string) => (hex === CONSULT_COLOR ? "#f3f2f0" : `${hex}1c`)

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// The realtor's week: seven days across, the hours down the side.
export default function WeekView({
  monday,
  todayKey,
  now,
  tz,
  items,
  due,
  weekdays,
  dayStart,
  dayEnd,
}: {
  monday: string
  todayKey: string
  now: Date
  tz: string
  items: WeekItem[]
  due: WeekDue[]
  weekdays: number[]
  dayStart: number
  dayEnd: number
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const keyOf = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd")
  const hourOf = (d: Date) => Number(formatInTimeZone(d, tz, "H")) + Number(formatInTimeZone(d, tz, "m")) / 60

  // Show the working day with an hour of breathing room, stretched to fit anything outside it.
  let first = Math.max(0, dayStart - 1)
  let last = Math.min(24, dayEnd + 1)
  for (const it of items) {
    first = Math.min(first, Math.floor(hourOf(it.start)))
    const e = keyOf(it.end) === keyOf(it.start) ? hourOf(it.end) : 24
    last = Math.max(last, Math.ceil(e))
  }
  const hours = Array.from({ length: last - first }, (_, i) => first + i)
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`

  // Side-by-side lanes for anything that overlaps on the same day.
  const placed = days.map((day) => {
    const list = items.filter((it) => keyOf(it.start) === day).sort((a, b) => a.start.getTime() - b.start.getTime())
    const out: { it: WeekItem; lane: number; lanes: number }[] = []
    let group: { it: WeekItem; lane: number; lanes: number }[] = []
    let groupEnd = 0
    const flush = () => {
      const lanes = Math.max(1, ...group.map((g) => g.lane + 1))
      group.forEach((g) => (g.lanes = lanes))
      out.push(...group)
      group = []
    }
    for (const it of list) {
      if (group.length && it.start.getTime() >= groupEnd) flush()
      const taken = new Set(group.filter((g) => g.it.end.getTime() > it.start.getTime()).map((g) => g.lane))
      let lane = 0
      while (taken.has(lane)) lane++
      group.push({ it, lane, lanes: 1 })
      groupEnd = Math.max(groupEnd, it.end.getTime())
    }
    flush()
    return out
  })

  const nowTop = (hourOf(now) - first) * HOUR
  const showNow = days.includes(todayKey) && hourOf(now) >= first && hourOf(now) <= last

  return (
    <div className="mt-9">
      <div className="overflow-x-auto rounded-2xl border border-[#e3e0dc] bg-white">
        <div className="min-w-[820px]">
          <div className="flex border-b border-[#e3e0dc]">
            <div className="w-[64px] shrink-0" />
            <div className="grid flex-1 grid-cols-7">
              {days.map((d, i) => (
                <div key={d} className="border-l border-[#efece8] px-3 py-3.5">
                  <p className={`text-[11px] font-medium uppercase tracking-[.1em] ${d === todayKey ? "text-[#D9467A]" : "text-[#8e8c93]"}`}>{NAMES[i]}</p>
                  <p className="mt-1 font-[Georgia,serif] text-[24px] leading-none">{Number(d.slice(8, 10))}</p>
                </div>
              ))}
            </div>
          </div>

          {due.length > 0 && (
            <div className="flex border-b border-[#e3e0dc] bg-[#fbfaf9]">
              <div className="w-[64px] shrink-0 py-2.5 pr-3 text-right text-[10.5px] font-medium uppercase tracking-[.1em] text-[#8e8c93]">Due</div>
              <div className="grid flex-1 grid-cols-7 text-[11.5px]">
                {days.map((d) => (
                  <div key={d} className="min-w-0 space-y-1 border-l border-[#efece8] px-2 py-2">
                    {due
                      .filter((x) => x.day === d)
                      .map((x) => (
                        <Link
                          key={x.id}
                          href={x.href}
                          title={x.label}
                          className={`block truncate rounded-full border border-[#e9e5e0] bg-white px-2.5 py-1 ${x.late ? "text-[#c23d6d]" : "text-[#5d5b62]"}`}
                        >
                          {x.label}
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex">
            <div className="w-[64px] shrink-0">
              {hours.map((h, i) => (
                <div key={h} className="pr-3 text-right font-[Georgia,serif] text-[12px] text-[#8e8c93]" style={{ height: HOUR, transform: "translateY(-7px)" }}>
                  {i === 0 ? "" : label(h)}
                </div>
              ))}
            </div>
            <div className="relative flex-1" style={{ height: hours.length * HOUR }}>
              {hours.slice(1).map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-[#f1eeea]" style={{ top: (i + 1) * HOUR }} />
              ))}
              <div className="absolute inset-0 grid grid-cols-7">
                {days.map((d, i) => {
                  const on = weekdays.includes(i + 1)
                  const before = on ? Math.max(0, dayStart - first) * HOUR : hours.length * HOUR
                  const after = on ? Math.max(0, last - dayEnd) * HOUR : 0
                  return (
                    <div key={d} className={`relative border-l border-[#efece8] ${d === todayKey ? "bg-[#fff8fa]" : ""}`}>
                      {before > 0 && <div className="absolute inset-x-0 top-0 bg-[#f4f3f1]/80" style={{ height: before }} />}
                      {after > 0 && <div className="absolute inset-x-0 bottom-0 bg-[#f4f3f1]/80" style={{ height: after }} />}
                      {placed[i].map(({ it, lane, lanes }) => {
                        const top = (hourOf(it.start) - first) * HOUR
                        const endH = keyOf(it.end) === d ? hourOf(it.end) : last
                        const height = Math.max(24, (endH - hourOf(it.start)) * HOUR - 3)
                        const style = {
                          top,
                          height,
                          left: `calc(${(lane / lanes) * 100}% + 3px)`,
                          width: `calc(${100 / lanes}% - 6px)`,
                          background: tint(it.color),
                          borderColor: it.color,
                        }
                        const inner = (
                          <>
                            <p className="truncate text-[12.5px] font-medium leading-tight">{it.title}</p>
                            {height >= 40 && <p className="mt-0.5 truncate text-[11.5px] text-[#5d5b62]">{it.tag}</p>}
                          </>
                        )
                        const cls = "absolute overflow-hidden rounded-[9px] border-l-[3px] px-2 py-1"
                        const tip = `${formatInTimeZone(it.start, tz, "h:mm a")} to ${formatInTimeZone(it.end, tz, "h:mm a")} · ${it.title} · ${it.tag}`
                        return it.href ? (
                          <Link key={it.id} href={it.href} title={tip} className={`${cls} hover:brightness-[.97]`} style={style}>
                            {inner}
                          </Link>
                        ) : (
                          <div key={it.id} title={tip} className={cls} style={style}>
                            {inner}
                          </div>
                        )
                      })}
                      {showNow && d === todayKey && (
                        <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop - 4 }}>
                          <span className="-ml-1 h-2 w-2 rounded-full bg-[#D9467A]" />
                          <span className="h-px flex-1 bg-[#D9467A]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[#5d5b62]">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: CONSULT_COLOR }} />Consultation</span>
        {EVENT_KINDS.map((k) => (
          <span key={k.key} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: k.color }} />{k.label}</span>
        ))}
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px] border border-[#cfcbc5] bg-[#eceae7]" />Outside your hours</span>
      </div>
    </div>
  )
}
