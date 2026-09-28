// Shared account-status logic for the team space. Plain module.

export const MONTHLY_PRICE = 39 // Solo Agent, $39/month

export type StatusKey = "paying" | "trial" | "canceled" | "expired"

export function statusOf(a: { subscription_status: string | null; trial_ends_at: string | null }): {
  key: StatusKey
  label: string
} {
  const s = (a.subscription_status || "").toLowerCase()
  if (s === "active" || s === "trialing") return { key: "paying", label: "Paying" }
  if (s === "canceled" || s === "cancelled") return { key: "canceled", label: "Canceled" }
  const ends = a.trial_ends_at ? new Date(a.trial_ends_at).getTime() : 0
  if (ends && ends > Date.now()) return { key: "trial", label: "On trial" }
  return { key: "expired", label: "Trial ended" }
}

export const PILL: Record<StatusKey, string> = {
  paying: "bg-[#16151a] text-white",
  trial: "bg-[#FBC98E]/40 text-[#8a5a1e]",
  canceled: "bg-[#D9467A]/10 text-[#D9467A]",
  expired: "bg-[#16151a]/[0.07] text-[#16151a]/55",
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  })
}
