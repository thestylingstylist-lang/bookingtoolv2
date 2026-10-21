"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { assistantFor } from "@/lib/assistant"
import type { SettingsResult } from "./actions"

// The Marvberry AI switches, plus a few messages so drafts learn their voice.
export async function saveAssistant(_prev: SettingsResult | null, formData: FormData): Promise<SettingsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const settings = await assistantFor(supabase, user.id)
  const on = (k: string) => formData.get(k) === "on"

  // Everyone has the morning update and offer nudges.
  const { error: prefErr } = await supabase
    .from("agents")
    .update({ morning_email: on("morning"), offer_nudges: on("offerNudges") })
    .eq("id", user.id)

  // Writing in their voice is on the Marvberry Assistant plan.
  if (settings.unlocked) {
    const reminders = on("reminders")
    const auto = reminders && on("auto")
    const voice = String(formData.get("voice") ?? "").trim().slice(0, 6000)
    const { error } = await supabase.from("agents").update({ assistant_auto: auto, assistant_voice: voice }).eq("id", user.id)
    if (error) return { ok: false, message: "Couldn't save. Please try again." }
    await supabase.from("agents").update({ assistant_reminders: reminders, assistant_replies: on("replies") }).eq("id", user.id)
  }
  if (prefErr) return { ok: false, message: "Saved, except your switches. Those aren't set up yet." }

  revalidatePath("/settings")
  revalidatePath("/clients", "layout")
  return { ok: true, message: "Saved." }
}
