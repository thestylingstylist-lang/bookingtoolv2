import "server-only"
import { AGENT_DEFAULTS } from "./config"
import type { AgentRow } from "./agent"

// Signals we can read to decide whether a step is done, without tracking
// extra state. Extend this object as new steps need new evidence.
export type SetupSignals = {
  agent: AgentRow
  bookingCount: number
}

export type SetupStep = {
  key: string
  title: string
  detail: string
  cta: string
  href: string
  done: (s: SetupSignals) => boolean
}

function scheduleChanged(a: AgentRow): boolean {
  const d = AGENT_DEFAULTS
  return (
    a.day_start !== d.startHour ||
    a.day_end !== d.endHour ||
    a.slot_minutes !== d.slotMinutes ||
    a.days_ahead !== d.daysAhead ||
    a.timezone !== d.timezone ||
    a.weekdays.length !== d.weekdays.length ||
    a.weekdays.some((w, i) => w !== d.weekdays[i])
  )
}

// The list IS the product map for onboarding. Add a step by adding an entry;
// nothing else needs to change. Later: team invites, business verification.
export const SETUP_STEPS: SetupStep[] = [
  {
    key: "brand",
    title: "Add your logo and photo",
    detail: "Put your face and mark on your booking page so it looks like you, not a form.",
    cta: "Add branding",
    href: "/settings",
    done: (s) => !!(s.agent.logo_url || s.agent.headshot_url),
  },
  {
    key: "welcome",
    title: "Write your welcome message",
    detail: "A short, warm note and a tagline that greet clients when they land on your page.",
    cta: "Write message",
    href: "/settings",
    done: (s) => !!(s.agent.welcome_message || s.agent.tagline),
  },
  {
    key: "schedule",
    title: "Set your availability",
    detail: "Choose the days, hours, and call length that fit how you actually work.",
    cta: "Set availability",
    href: "/settings",
    done: (s) => scheduleChanged(s.agent),
  },
  {
    key: "share",
    title: "Share your booking link",
    detail: "Send your link to a client or add it to your bio. Your first booking marks this done.",
    cta: "View your link",
    href: "/dashboard",
    done: (s) => s.bookingCount > 0,
  },
]

export function setupProgress(steps: SetupStep[], signals: SetupSignals) {
  const done = steps.filter((st) => st.done(signals)).length
  return { done, total: steps.length, complete: done === steps.length }
}
