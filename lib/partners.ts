// Partner program settings, shared by the referral link, signup, Stripe and the pages.
export const REF_COOKIE = "mb_ref"
export const REF_DAYS = 60 // how long a referral link click counts
export const COMMISSION_PCT = 30
export const COMMISSION_MONTHS = 12
export const COACH_TRIAL_DAYS = 30
export const MIN_PAYOUT_CENTS = 2500 // pay out once a partner is owed $25 or more

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 })

// Turn a name into a short, readable link code: "Dana Lee" -> "danalee".
export function codeFrom(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "partner"
  )
}
