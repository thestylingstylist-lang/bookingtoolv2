// The things a realtor puts on the calendar by hand. Plain module: safe to
// import from server and client code.

export type EventKind = "showing" | "closing" | "open_house"

export const EVENT_KINDS: { key: EventKind; label: string; color: string; placeLabel: string; placeHint: string }[] = [
  { key: "showing", label: "Showing", color: "#D9467A", placeLabel: "Property address", placeHint: "14 Maple Avenue" },
  { key: "closing", label: "Closing", color: "#EE7C55", placeLabel: "Where", placeHint: "Office or address" },
  { key: "open_house", label: "Open house", color: "#b89250", placeLabel: "Property address", placeHint: "61 Orchard Street" },
]

export const CONSULT_COLOR = "#16151a"

export function toKind(v: unknown): EventKind | null {
  return v === "showing" || v === "closing" || v === "open_house" ? v : null
}

export function kindMeta(k: string) {
  return EVENT_KINDS.find((e) => e.key === k) ?? EVENT_KINDS[0]
}

export type Busy = { start: number; end: number }

// "45 min", "1 hr", "1 hr 30 min"
export function lengthLabel(ms: number) {
  const m = Math.round(ms / 60000)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} hr ${r} min` : `${h} hr`
}

// Time already spoken for by events, so clients are never offered it.
// Quietly empty if the events table isn't there yet.
export async function busyRanges(
  db: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  agentId: string
): Promise<Busy[]> {
  try {
    const { data, error } = await db
      .from("events")
      .select("starts_at, ends_at")
      .eq("agent_id", agentId)
      .gte("ends_at", new Date().toISOString())
    if (error) return []
    return ((data ?? []) as { starts_at: string; ends_at: string }[]).map((e) => ({
      start: new Date(e.starts_at).getTime(),
      end: new Date(e.ends_at).getTime(),
    }))
  } catch {
    return []
  }
}
