import type { AgentConfig } from "@/lib/config"

// The Marvberry team's own sales-call hours. Mon–Thu, 8am–6pm Eastern.
export const CHAT_CFG: AgentConfig = {
  timezone: "America/New_York",
  weekdays: [1, 2, 3, 4],
  startHour: 8,
  endHour: 18,
  slotMinutes: 30,
  daysAhead: 21,
  minNoticeHours: 12,
}

export const CHAT_HOST = {
  name: "Alecia Ford",
  first: "Alecia",
  email: "team@marvberry.com",
}

export const CHAT_EVENT_TITLE = "Marvberry chat with Alecia"

// Alecia's personal Zoom room — used for every video booking until auto-generated links are set up.
export const CHAT_ZOOM = {
  url: "https://us06web.zoom.us/j/3835401799?pwd=RWpnWUVIREU2Vy8waEtTZ2IwVzVXUT09",
  meetingId: "383 540 1799",
  passcode: "fg6qDe",
}
