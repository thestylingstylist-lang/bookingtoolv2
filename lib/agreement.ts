// Agreement defaults the realtor sets once in Settings. Every agreement
// they send fills these in on its own, so commission is all that's left.

export const AGREEMENT_LENGTHS = [30, 60, 90, 180, 365] as const
export const DEFAULT_AGREEMENT_DAYS = 90

export type AgreementSettings = { days: number; exclusive: boolean }

export const AGREEMENT_DEFAULTS: AgreementSettings = {
  days: DEFAULT_AGREEMENT_DAYS,
  exclusive: true,
}

export function lengthLabel(days: number): string {
  return days === 365 ? "1 year" : `${days} days`
}

// The blanks these settings fill, keyed like [[End date]] in a template.
export function agreementAuto(s: AgreementSettings, timezone: string): Record<string, string> {
  const end = new Date(Date.now() + s.days * 86_400_000)
  const endLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(end)
  return {
    "end date": endLabel,
    "agreement length": lengthLabel(s.days),
    "exclusive or non-exclusive": s.exclusive ? "exclusive" : "non-exclusive",
  }
}

// Read a realtor's saved defaults. Falls back quietly if none are saved.
export function toAgreementSettings(row: unknown): AgreementSettings {
  const r = (row ?? {}) as { agreement_days?: number | null; agreement_exclusive?: boolean | null }
  return {
    days:
      typeof r.agreement_days === "number" && r.agreement_days > 0
        ? r.agreement_days
        : DEFAULT_AGREEMENT_DAYS,
    exclusive: r.agreement_exclusive ?? true,
  }
}
