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
