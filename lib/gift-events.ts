import "server-only"
import { createClient } from "./supabase/server"
import { createAdminClient } from "./supabase/admin"
import { isAdminEmail } from "./admin"

export type GiftKind = "open" | "screen" | "claim_start" | "claimed"

// Stamps what she does with her gift card. Skips your own visits (signed in
// as admin) so testing the link doesn't count. Never breaks the page.
export async function recordGiftEvent(agentId: string, kind: GiftKind, detail?: string, skipAdmin = true) {
  try {
    if (skipAdmin) {
      const { data: { user } } = await (await createClient()).auth.getUser()
      if (user && isAdminEmail(user.email)) return
    }
    await createAdminClient().from("gift_events").insert({ agent_id: agentId, kind, detail: detail?.slice(0, 40) || null })
  } catch {}
}

export type GiftSummary = {
  opens: number
  firstOpen: string | null
  lastOpen: string | null
  via: string[]          // short | qr | link
  screens: string[]
  claimStart: string | null
  claimed: string | null
}

export async function giftSummaries(agentIds: string[]): Promise<Record<string, GiftSummary>> {
  const out: Record<string, GiftSummary> = {}
  if (!agentIds.length) return out
  try {
    const { data } = await createAdminClient()
      .from("gift_events")
      .select("agent_id, created_at, kind, detail")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: true })
      .limit(20000)
    for (const e of data ?? []) {
      const s = (out[e.agent_id] ??= { opens: 0, firstOpen: null, lastOpen: null, via: [], screens: [], claimStart: null, claimed: null })
      if (e.kind === "open") {
        s.opens++
        s.firstOpen ??= e.created_at
        s.lastOpen = e.created_at
        if (e.detail && !s.via.includes(e.detail)) s.via.push(e.detail)
      } else if (e.kind === "screen") {
        if (e.detail && !s.screens.includes(e.detail)) s.screens.push(e.detail)
      } else if (e.kind === "claim_start") s.claimStart ??= e.created_at
      else if (e.kind === "claimed") s.claimed ??= e.created_at
    }
  } catch {}
  return out
}
