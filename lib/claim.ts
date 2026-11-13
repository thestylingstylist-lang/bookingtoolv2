import "server-only"
import { createAdminClient } from "./supabase/admin"

// A gift card nobody has claimed yet: it stays private, and takes no bookings.
// Returns the claim token, or "" once the card belongs to someone.
export async function claimTokenOf(agentId: string): Promise<string> {
  try {
    const { data } = await createAdminClient().from("agents").select("claim_token").eq("id", agentId).maybeSingle()
    return (data?.claim_token as string) || ""
  } catch {
    return ""
  }
}
