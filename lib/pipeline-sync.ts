import "server-only"
import { createAdminClient } from "./supabase/admin"

// When a gift card is claimed, the lead it's linked to moves to Card Claimed
// on its own, and the day 2 and day 7 follow-ups start counting.
export async function markLeadClaimed(agentId: string) {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from("pipeline_leads")
      .select("id, replied_at, yes_at, sent_at")
      .eq("agent_id", agentId)
      .in("stage", ["list", "texted", "replied", "yes", "sent"])
    const now = new Date().toISOString()
    for (const l of data ?? []) {
      await db
        .from("pipeline_leads")
        .update({
          stage: "claimed",
          claimed_at: now,
          replied_at: l.replied_at ?? now,
          yes_at: l.yes_at ?? now,
          sent_at: l.sent_at ?? now,
        })
        .eq("id", l.id)
      await db.from("pipeline_touches").insert({ lead_id: l.id, note: "Claimed her card" })
    }
  } catch {}
}

// A card made from her lead: link it, and move her to Card Sent.
export async function linkLeadToCard(leadId: string, agentId: string) {
  try {
    const db = createAdminClient()
    const { data: l } = await db.from("pipeline_leads").select("stage, replied_at, yes_at, sent_at").eq("id", leadId).maybeSingle()
    if (!l) return
    const now = new Date().toISOString()
    const early = ["list", "texted", "replied", "yes"].includes(l.stage as string)
    await db
      .from("pipeline_leads")
      .update({
        agent_id: agentId,
        ...(early ? { stage: "sent", replied_at: l.replied_at ?? now, yes_at: l.yes_at ?? now, sent_at: l.sent_at ?? now } : {}),
      })
      .eq("id", leadId)
    await db.from("pipeline_touches").insert({ lead_id: leadId, note: "Made her card" })
  } catch {}
}
