export const STAGES = ["texted", "replied", "yes", "sent", "claimed", "active", "paid", "lost"] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
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
  brokerage: string | null
  town: string | null
  source: string | null
  kind: "broker" | "solo"
  hook: string | null
  message: string | null
  notes: string | null
  stage: Stage
  last_contact_at: string
  next_follow_up: string | null
  agent_id: string | null
  replied_at: string | null
  yes_at: string | null
  sent_at: string | null
  claimed_at: string | null
  active_at: string | null
  paid_at: string | null
}

export type Touch = { id: number; lead_id: string; created_at: string; note: string }

const DAY = 864e5

// What's due on a lead right now, or null. A logged touch after the
// milestone clears it.
export function alertFor(l: Lead, now = Date.now()): string | null {
  const last = new Date(l.last_contact_at).getTime()
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
