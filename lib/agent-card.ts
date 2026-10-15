import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AgentCard } from "@/lib/letter"

// Loads what goes in a realtor's email signature. Null if anything fails, so an
// email still goes out without it.
export async function agentCard(agentId: string): Promise<AgentCard | null> {
  try {
    const { data } = await createAdminClient().from("agents").select("*").eq("id", agentId).maybeSingle()
    if (!data) return null
    const a = data as Record<string, string | null>
    const name = (a.full_name || a.business_name || "").trim()
    if (!name) return null
    return {
      name,
      business: (a.business_name || "").trim() || undefined,
      license: (a.license_number || "").trim() || undefined,
      phone: (a.public_phone || "").trim() || undefined,
      email: (a.public_email || "").trim() || undefined,
      // Photo only when they picked the photo layout and have a headshot.
      photo: (data as { signature_photo?: boolean }).signature_photo ? (a.headshot_url || "").trim() || undefined : undefined,
      site: a.slug ? `https://www.marvberry.com/book/${a.slug}` : undefined,
    }
  } catch {
    return null
  }
}
