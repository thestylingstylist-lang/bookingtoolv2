import { addDays } from "date-fns"
import { fromZonedTime, formatInTimeZone } from "date-fns-tz"
import type { AgentConfig } from "./config"

export type Slot = {
  startISO: string // UTC instant, the canonical value stored + submitted
  dayLabel: string // e.g. "Thu, Feb 12"
  timeLabel: string // e.g. "9:30 AM"
}

const pad = (n: number) => String(n).padStart(2, "0")

// Every open slot from now to daysAhead, in the agent's timezone,
// excluding already-booked instants.
export function generateSlots(cfg: AgentConfig, takenISO: Set<string> = new Set()): Slot[] {
  const tz = cfg.timezone
  const now = new Date()
  const slots: Slot[] = []

  for (let d = 0; d < cfg.daysAhead; d++) {
    const day = addDays(now, d)
    const weekday = Number(formatInTimeZone(day, tz, "i")) // 1..7 (Mon..Sun)
    if (!cfg.weekdays.includes(weekday)) continue

    const dateStr = formatInTimeZone(day, tz, "yyyy-MM-dd")
    const totalMinutes = (cfg.endHour - cfg.startHour) * 60

    for (let m = 0; m < totalMinutes; m += cfg.slotMinutes) {
      const hour = cfg.startHour + Math.floor(m / 60)
      const minute = m % 60
      const wallClock = `${dateStr}T${pad(hour)}:${pad(minute)}:00`
      const startUTC = fromZonedTime(wallClock, tz)

      if (startUTC.getTime() <= now.getTime()) continue // no past slots
      const iso = startUTC.toISOString()
      if (takenISO.has(iso)) continue

      slots.push({
        startISO: iso,
        dayLabel: formatInTimeZone(startUTC, tz, "EEE, MMM d"),
        timeLabel: formatInTimeZone(startUTC, tz, "h:mm a"),
      })
    }
  }
  return slots
}

// True if a submitted instant is a real, currently-open slot for this agent.
export function isValidOpenSlot(
  cfg: AgentConfig,
  startISO: string,
  takenISO: Set<string>
): boolean {
  return generateSlots(cfg, takenISO).some((s) => s.startISO === startISO)
}

// Format a stored instant in a given timezone, for dashboard display.
export function formatSlot(startISO: string, timezone: string): string {
  return formatInTimeZone(new Date(startISO), timezone, "EEE, MMM d · h:mm a")
}
