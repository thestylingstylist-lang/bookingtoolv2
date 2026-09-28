// The one place that decides who can see the internal admin area.
// Add emails here (lowercase). Kept out of the DB on purpose so it stays simple.
export const ADMIN_EMAILS = ["team@marvberry.com"]

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
