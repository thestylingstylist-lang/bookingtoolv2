"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { assistantFor } from "@/lib/assistant"
import type { SettingsResult } from "./actions"

// Her two choices for Marvberry Assistant: approve every message, or let
// reminders go out on their own; and a few messages so it learns her voice.
export async function saveAssistant(_prev: SettingsResult | null, formData: FormData): Promise<SettingsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const settings = await assistantFor(supabase, user.id)
  if (!settings.unlocked) return { ok: false, message: "Marvberry Assistant isn't on your plan yet." }

  const auto = formData.get("mode") === "auto"
  const voice = String(formData.get("voice") ?? "").trim().slice(0, 6000)

  const { error } = await supabase.from("agents").update({ assistant_auto: auto, assistant_voice: voice }).eq("id", user.id)
  if (error) return { ok: false, message: "Couldn't save. Please try again." }

  revalidatePath("/settings")
  return {
    ok: true,
    message: auto
      ? "Saved. Reminders will go out on their own, in your voice."
      : "Saved. You'll read and approve every message before it goes out.",
  }
}
