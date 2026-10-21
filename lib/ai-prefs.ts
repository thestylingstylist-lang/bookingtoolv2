import type { SupabaseClient } from "@supabase/supabase-js"

// The Marvberry AI switches. Everything is on until the realtor turns it off,
// and on as well if the columns aren't there yet.
export type AiPrefs = { reminders: boolean; replies: boolean; morning: boolean; offerNudges: boolean }
export const AI_DEFAULTS: AiPrefs = { reminders: true, replies: true, morning: true, offerNudges: true }

export async function aiPrefsFor(db: SupabaseClient, agentId: string): Promise<AiPrefs> {
  const { data, error } = await db
    .from("agents")
    .select("assistant_reminders, assistant_replies, morning_email, offer_nudges")
    .eq("id", agentId)
    .maybeSingle()
  if (error || !data) return AI_DEFAULTS
  const r = data as Record<string, boolean | null>
  return {
    reminders: r.assistant_reminders !== false,
    replies: r.assistant_replies !== false,
    morning: r.morning_email !== false,
    offerNudges: r.offer_nudges !== false,
  }
}
