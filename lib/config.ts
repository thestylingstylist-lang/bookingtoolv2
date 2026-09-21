// Defaults applied to a brand-new agent at signup. After that, each agent's
// own settings live in the database (agents table) and are editable in-app.
export const AGENT_DEFAULTS = {
  timezone: "America/New_York",
  weekdays: [1, 2, 3, 4, 5], // ISO days: 1 = Mon ... 7 = Sun
  startHour: 9,
  endHour: 17,
  slotMinutes: 30,
  daysAhead: 14,
} as const

// The shape the slot generator needs. Loaded per-agent from the DB.
export type AgentConfig = {
  timezone: string
  weekdays: number[] // ISO 1..7
  startHour: number
  endHour: number
  slotMinutes: number
  daysAhead: number
}

// Map a raw agents-table row into the config the slot generator expects.
export function toAgentConfig(row: {
  timezone: string
  weekdays: number[]
  day_start: number
  day_end: number
  slot_minutes: number
  days_ahead: number
}): AgentConfig {
  return {
    timezone: row.timezone,
    weekdays: row.weekdays,
    startHour: row.day_start,
    endHour: row.day_end,
    slotMinutes: row.slot_minutes,
    daysAhead: row.days_ahead,
  }
}

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const

export const WEEKDAY_LABELS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
]

export const MEETING_TYPES = ["virtual", "phone"] as const
export type MeetingType = (typeof MEETING_TYPES)[number]
