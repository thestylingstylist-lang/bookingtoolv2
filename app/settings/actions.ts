"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { TIMEZONES } from "@/lib/config"

export type SettingsResult = { ok: boolean; message: string }

export async function saveSettings(
  _prev: SettingsResult | null,
  formData: FormData
): Promise<SettingsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const businessName = String(formData.get("businessName") ?? "").trim()
  const fullName = String(formData.get("fullName") ?? "").trim()
  const timezone = String(formData.get("timezone") ?? "").trim()
  const dayStart = Number(formData.get("dayStart"))
  const dayEnd = Number(formData.get("dayEnd"))
  const slotMinutes = Number(formData.get("slotMinutes"))
  const daysAhead = Number(formData.get("daysAhead"))
  const weekdays = formData
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7)

  if (!businessName) return { ok: false, message: "Business name can't be empty." }
  if (!(TIMEZONES as readonly string[]).includes(timezone))
    return { ok: false, message: "Pick a timezone from the list." }
  if (weekdays.length === 0)
    return { ok: false, message: "Choose at least one working day." }
  if (!(dayEnd > dayStart))
    return { ok: false, message: "End time must be after start time." }
  if (![15, 30, 45, 60].includes(slotMinutes))
    return { ok: false, message: "Pick a valid slot length." }
  if (daysAhead < 1 || daysAhead > 60)
    return { ok: false, message: "Booking window must be between 1 and 60 days." }

  const { error } = await supabase
    .from("agents")
    .update({
      business_name: businessName,
      full_name: fullName,
      timezone,
      weekdays,
      day_start: dayStart,
      day_end: dayEnd,
      slot_minutes: slotMinutes,
      days_ahead: daysAhead,
    })
    .eq("id", user.id)

  if (error) return { ok: false, message: "Couldn't save. Please try again." }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true, message: "Saved." }
}
