export const STAGES = ["list", "texted", "replied", "yes", "sent", "claimed", "active", "paid", "lost"] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  list: "List",
  texted: "Texted",
  replied: "Replied",
  yes: "Said Yes",
  sent: "Card Sent",
  claimed: "Card Claimed",
  active: "Active Day 7",
  paid: "Paid $67/mo",
  lost: "Lost",
}

export const SOURCES = ["Zillow", "Instagram", "LinkedIn", "Other"] as const
export const GOAL = 30

export type Lead = {
  id: string
  created_at: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  office_phone: string | null
  years: string | null
  sold_last_month: string | null
  zillow_url: string | null
  brokerage: string | null
  town: string | null
  source: string | null
  kind: "broker" | "solo"
  hook: string | null
  message: string | null
  notes: string | null
  stage: Stage
  last_contact_at: string
  texted_at?: string | null
  has_website?: boolean | null
  starred?: boolean | null
  lost_at?: string | null
  next_follow_up: string | null
  agent_id: string | null
  replied_at: string | null
  yes_at: string | null
  sent_at: string | null
  claimed_at: string | null
  active_at: string | null
  paid_at: string | null
}

export type Touch = { id: number; lead_id: string; created_at: string; note: string; channel?: string | null }

export const CHANNEL_LABEL: Record<string, string> = { text: "Text", call: "Call", dm: "DM", email: "Email" }

export type Gift = {
  opens: number
  firstOpen: string | null
  lastOpen: string | null
  via: string[]
  screens: string[]
  claimStart: string | null
  claimed: string | null
}

export const VIA_LABEL: Record<string, string> = { short: "your text", qr: "the QR code", link: "the long link" }
export const SCREEN_LABEL: Record<string, string> = { time: "times", details: "booking form", ask: "contact form", done: "booked", sent: "sent a request" }

// How far a lead got. Where she sits now is the truth; only a Lost lead
// falls back on the stages she reached before she was lost.
const STAMPED: Partial<Record<Stage, keyof Lead>> = {
  texted: "texted_at", replied: "replied_at", yes: "yes_at", sent: "sent_at", claimed: "claimed_at", active: "active_at", paid: "paid_at",
}
export function reached(l: Lead, s: Stage): boolean {
  if (l.stage === "lost") {
    if (s === "texted") return true
    const col = STAMPED[s]
    return !!(col && l[col])
  }
  return STAGES.indexOf(l.stage) >= STAGES.indexOf(s)
}

const DAY = 864e5

// What's due on a lead right now, or null. A logged touch after the
// milestone clears it.
export function alertFor(l: Lead, now = Date.now(), g?: Gift): string | null {
  const last = new Date(l.last_contact_at).getTime()
  if (g?.claimStart && !g.claimed && (l.stage === "sent" || l.stage === "yes") && last < new Date(g.claimStart).getTime())
    return "Started claiming, didn't finish"
  if (l.stage === "texted" && now - last >= 3 * DAY) return "No reply in 3 days"
  if (l.claimed_at && (l.stage === "claimed" || l.stage === "active")) {
    const claimed = new Date(l.claimed_at).getTime()
    const days = (now - claimed) / DAY
    const due = (d: number) => days >= d && last < claimed + d * DAY
    if (l.stage === "active" && due(10)) return "Day 10: paid offer"
    if (l.stage === "claimed" && due(7)) return "Day 7 check-in"
    if (l.stage === "claimed" && due(2)) return "Day 2 check-in"
  }
  return null
}
