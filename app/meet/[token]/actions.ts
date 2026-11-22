"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { confirmChoice } from "@/lib/meetings"

// The client tapped "Confirm this time".
export async function confirmMeeting(formData: FormData) {
  const token = String(formData.get("token") ?? "").slice(0, 64)
  const option = String(formData.get("option") ?? "").slice(0, 60)
  const r = await confirmChoice(createAdminClient(), token, option)
  if (r.ok) redirect(`/meet/${token}?done=1`)
  redirect(`/meet/${token}?problem=${r.reason}`)
}
