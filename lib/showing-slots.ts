// Showing times the client picks: exact hour slots, 8 AM to 8 PM, in her own time zone.
// A slot is "2026-12-03|10" (the hour it starts). Used on both sides, so it stays plain.

export const FIRST_HOUR = 8
export const LAST_HOUR = 19 // the last slot starts at 7 PM and ends at 8 PM

export const SLOT_RE = /^(\d{4}-\d{2}-\d{2})\|(0[89]|1\d)$/

function h12(h: number) {
  const n = h % 12 === 0 ? 12 : h % 12
  return { n, ap: h < 12 || h === 24 ? "AM" : "PM" }
}

// "10–11 AM", "11 AM–12 PM"
export function rangeLabel(start: number, end: number) {
  const a = h12(start)
  const b = h12(end)
  return a.ap === b.ap ? `${a.n}–${b.n} ${b.ap}` : `${a.n} ${a.ap}–${b.n} ${b.ap}`
}

// "8:00 AM" on the slot buttons
export function slotLabel(h: number) {
  const a = h12(h)
  return `${a.n}:00 ${a.ap}`
}

export function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(",", "")
}

// One line per day, next-door hours joined: ["Thu Dec 3: 10–11 AM, 2–3 PM", "Sat Dec 5: 11 AM–12 PM"]
export function summaryLines(slots: string[]): string[] {
  const byDay = new Map<string, number[]>()
  for (const s of slots) {
    const m = SLOT_RE.exec(s)
    if (!m) continue
    byDay.set(m[1], [...(byDay.get(m[1]) ?? []), Number(m[2])])
  }
  return [...byDay.keys()].sort().map((d) => {
    const hours = [...new Set(byDay.get(d))].sort((a, b) => a - b)
    const ranges: [number, number][] = []
    for (const h of hours) {
      const last = ranges[ranges.length - 1]
      if (last && last[1] === h) last[1] = h + 1
      else ranges.push([h, h + 1])
    }
    return `${dayLabel(d)}: ${ranges.map(([a, b]) => rangeLabel(a, b)).join(", ")}`
  })
}

// "Thu Dec 3: 10–11 AM, 2–3 PM. Sat Dec 5: 11 AM–12 PM."
export function summaryText(slots: string[]) {
  const lines = summaryLines(slots)
  return lines.length ? `${lines.join(". ")}.` : ""
}

// "Eastern Time", or the zone's name if the browser can't say
export function zoneLabel(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date())
    return parts.find((p) => p.type === "timeZoneName")?.value || tz
  } catch {
    return tz
  }
}

export function validZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}
