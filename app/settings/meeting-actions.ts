"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type MeetingLengthsResult = { ok: boolean; message: string }

export async function saveMeetingLengths(_prev: MeetingLengthsResult | null, formData: FormData): Promise<MeetingLengthsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Your session ended. Sign in again, then save." }
  const clamp = (v: FormDataEntryValue | null, d: number) => Math.min(Math.max(Math.round(Number(v)) || d, 10), 240)
  const { error } = await supabase
    .from("agents")
    .update({ meeting_call_minutes: clamp(formData.get("call"), 30), meeting_inperson_minutes: clamp(formData.get("inPerson"), 60) })
    .eq("id", user.id)
  if (error) return { ok: false, message: "Meeting lengths aren't switched on for your account yet. Message us from Support, and we'll turn them on." }
  revalidatePath("/settings")
  return { ok: true, message: "Saved." }
}
