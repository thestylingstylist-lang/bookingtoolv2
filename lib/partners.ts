// Partner program settings, shared by the referral link, signup, Stripe and the pages.
export const REF_COOKIE = "mb_ref"
export const REF_DAYS = 60 // how long a referral link click counts
export const COMMISSION_PCT = 30
export const COMMISSION_MONTHS = 12
export const COACH_TRIAL_DAYS = 30
export const MIN_PAYOUT_CENTS = 2500 // pay out once a partner is owed $25 or more

// Commission is on what Marvberry actually receives: the payment minus Stripe's fees
// (card processing 2.9% + 30¢, and Billing 0.7%). On $67 that's about $64.29, so 30% is about $19.29.
export function netAfterFees(cents: number) {
  return Math.max(0, Math.round(cents - (cents * 0.029 + 30) - cents * 0.007))
}

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

// Where a partner shares Marvberry. Saved one per line ("Instagram: @dana") so no new database column is needed.
export const SOCIALS = [
  { key: "instagram", label: "Instagram", hint: "@yourhandle" },
  { key: "tiktok", label: "TikTok", hint: "@yourhandle" },
  { key: "youtube", label: "YouTube", hint: "@yourchannel or link" },
  { key: "facebook", label: "Facebook", hint: "Page or group link" },
  { key: "website", label: "Website", hint: "yoursite.com" },
  { key: "other", label: "Anywhere else", hint: "Coaching group, brokerage, newsletter" },
] as const

// Turn a saved line into a link you can click to check them out.
export function socialLink(label: string, value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  const h = v.replace(/^@/, "")
  switch (label) {
    case "Instagram": return `https://www.instagram.com/${h}`
    case "TikTok": return `https://www.tiktok.com/@${h}`
    case "YouTube": return /\./.test(h) ? `https://${h}` : `https://www.youtube.com/@${h}`
    case "Facebook": return /\./.test(h) ? `https://${h}` : `https://www.facebook.com/${h}`
    case "Website": return `https://${h}`
    default: return /^[\w-]+\.[\w.-]+/.test(h) ? `https://${h}` : null
  }
}

export function parseSocials(audience: string | null): { label: string; value: string; href: string | null }[] {
  return String(audience ?? "")
    .split("\n")
    .map((line) => {
      const i = line.indexOf(":")
      const label = i > 0 ? line.slice(0, i).trim() : "Where"
      const value = i > 0 ? line.slice(i + 1).trim() : line.trim()
      return { label, value, href: socialLink(label, value) }
    })
    .filter((s) => s.value)
}
