export const STAGES = ["new", "call_booked", "called", "member", "lost"] as const
export type Stage = (typeof STAGES)[number]
