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
  min_notice_hours: number
  show_contact: boolean
  welcome_message: string
  tagline: string
  public_phone: string
  public_email: string
  logo_url: string
  headshot_url: string
  trial_ends_at: string | null
  subscription_status: string | null
}

// Single source of truth for the columns every page loads. Keeping this in
// one place stops the dashboard, settings and booking pages from drifting
// apart when new columns are added.
export const AGENT_SELECT =
  "id, business_name, full_name, slug, timezone, weekdays, day_start, day_end, slot_minutes, days_ahead, min_notice_hours, show_contact, welcome_message, tagline, public_phone, public_email, logo_url, headshot_url, trial_ends_at, subscription_status"

// Public lookup by booking-link slug (used by the public booking page).
export async function getAgentBySlug(slug: string): Promise<AgentRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agents")
    .select(AGENT_SELECT)
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  return data as AgentRow
}

// Turn a display name into a URL-safe slug base ("José Álvarez" -> "jose-alvarez").
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "")
  return base || "agent"
}

async function slugTaken(candidate: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from("agents").select("id").eq("slug", candidate).maybeSingle()
  if (data) return true
  // Old links that forward to someone else stay reserved.
  const { data: old } = await admin.from("slug_redirects").select("old_slug").eq("old_slug", candidate).maybeSingle()
  return !!old
}

// Find a slug not already taken: colin-thomas, then colin-thomas-2, -3 …
export async function uniqueSlug(base: string): Promise<string> {
  if (!(await slugTaken(base))) return base
  for (let n = 2; n < 50; n++) {
    const candidate = `${base}-${n}`
    if (!(await slugTaken(candidate))) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

// An old booking link that now belongs under a new slug. Returns the current slug, or null.
export async function findSlugRedirect(oldSlug: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("slug_redirects").select("agent_id").eq("old_slug", oldSlug).maybeSingle()
  if (!data?.agent_id) return null
  const { data: agent } = await admin.from("agents").select("slug").eq("id", data.agent_id).maybeSingle()
  return agent?.slug && agent.slug !== oldSlug ? agent.slug : null
}

export { AGENT_DEFAULTS }
