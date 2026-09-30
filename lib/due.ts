// Due dates on checklist steps. Stored as a plain date ("2026-10-03") and
// judged against "today" in the realtor's time zone, so nothing shifts a day.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function toDue(value: unknown): string | null {
  const v = String(value ?? "").trim()
  return DATE_RE.test(v) ? v : null
}

function utc(d: string) {
  const [y, m, day] = d.split("-").map(Number)
  return Date.UTC(y, m - 1, day)
}

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

export function daysUntil(due: string, tz: string) {
  return Math.round((utc(due) - utc(todayIn(tz))) / 86400000)
}

function say(due: string, style: "short" | "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style,
    month: style,
    day: "numeric",
  }).format(new Date(utc(due)))
}

// What the realtor sees. Supportive: the fact and the time, never a push.
export function agentDueLabel(due: string, tz: string) {
  const n = daysUntil(due, tz)
  if (n < 0) return `Was due ${say(due, "short")}`
  if (n === 0) return "Due today"
  if (n === 1) return "Due tomorrow"
  return `Due ${say(due, "short")} · ${n} days left`
}

// What the client sees. Always the full day and date, nothing to guess.
export function clientDueLabel(due: string, tz: string) {
  const n = daysUntil(due, tz)
  if (n < 0) return `Was due ${say(due, "long")}`
  if (n === 0) return `Due today, ${say(due, "long")}`
  if (n === 1) return `Due tomorrow, ${say(due, "long")}`
  return `Due ${say(due, "long")}`
}

export function isClose(due: string, tz: string) {
  return daysUntil(due, tz) <= 1
}
