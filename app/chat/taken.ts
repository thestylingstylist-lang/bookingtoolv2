import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// Times already booked on /chat, so no one double-books.
export async function takenChatSlots(): Promise<Set<string>> {
  try {
    const { data } = await createAdminClient()
      .from("sales_leads")
      .select("call_at")
      .eq("stage", "call_booked")
      .not("call_at", "is", null)
    return new Set((data ?? []).map((r) => new Date(r.call_at as string).toISOString()))
  } catch {
    return new Set()
  }
}
