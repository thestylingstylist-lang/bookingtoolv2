import "server-only"
import { createAdminClient } from "./supabase/admin"
import { AGENT_DEFAULTS } from "./config"

export type AgentRow = {
  id: string
  business_name: string
  full_name: string
  slug: string
  timezone: string
  weekdays: number[]
  day_start: number
  day_end: number
  slot_minutes: number
  days_ahead: number
}

const SELECT =
  "id, business_name, full_name, slug, timezone, weekdays, day_start, day_end, slot_minutes, days_ahead"

// Public lookup by booking-link slug (used by the public booking page).
export async function getAgentBySlug(slug: string): Promise<AgentRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agents")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  return data as AgentRow
}

// Turn a display name into a URL-safe slug base.
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return base || "agent"
}

// Find a slug not already taken, appending a short suffix if needed.
export async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient()
  let candidate = base
  for (let i = 0; i < 12; i++) {
    const { data } = await admin
      .from("agents")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }
  return `${base}-${Date.now().toString(36)}`
}

export { AGENT_DEFAULTS }
