export const SEEN_COOKIE = "mb_seen"
export const AWAY_MS = 30 * 60 * 1000

// From the cookie "since|lastSeen": the moment "while you were away" counts from.
export function sinceFrom(raw: string | undefined, now: number): number {
  const [s, a] = (raw ? decodeURIComponent(raw) : "").split("|").map(Number)
  if (!a) return now - 24 * 3600_000
  return now - a > AWAY_MS ? a : s || a
}
