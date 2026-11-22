import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// The first name of the team member who is signed in and sending, from their
// own account (Settings > Account, or the name they signed up with).
// No name on the account: emails come from "the Marvberry team".
export async function teamSender(): Promise<{ name: string; from: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await createAdminClient().from("agents").select("full_name").eq("id", user.id).maybeSingle()
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const full = String(data?.full_name || meta.full_name || meta.name || "").trim()
      const first = full.split(/\s+/)[0]
      if (first) return { name: first, from: `${first} at Marvberry` }
    }
  } catch {}
  return { name: "The Marvberry team", from: "Marvberry" }
}
