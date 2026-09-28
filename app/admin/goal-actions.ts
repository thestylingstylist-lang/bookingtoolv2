"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

export type GoalResult = { ok: boolean; message: string }

export async function setQuarterGoal(_prev: GoalResult | null, formData: FormData): Promise<GoalResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: "Not allowed." }

  const key = String(formData.get("key") || "")
  if (!/^goal:\d{4}-Q[1-4]$/.test(key)) return { ok: false, message: "Something went wrong." }
  const raw = String(formData.get("goal") || "").replace(/[$,\s]/g, "")
  const value = Number(raw)
  if (!raw || !Number.isFinite(value) || value < 0) return { ok: false, message: "Enter a dollar amount, like 5000." }

  const { error } = await createAdminClient()
    .from("admin_settings")
    .upsert({ key, value: Math.round(value), updated_at: new Date().toISOString() })
  if (error) return { ok: false, message: "Couldn’t save. Has the settings table been created?" }

  revalidatePath("/admin")
  return { ok: true, message: "Goal saved." }
}
