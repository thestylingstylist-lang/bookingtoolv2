"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

import { STAGES, type Stage } from "./stages"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")
}

export async function addLead(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const email = String(formData.get("email") ?? "").trim() || null
  const phone = String(formData.get("phone") ?? "").trim() || null
  const source = String(formData.get("source") ?? "").trim() || null
  await createAdminClient().from("sales_leads").insert({ name, email, phone, source })
  revalidatePath("/admin/sales")
}

export async function setStage(id: string, stage: Stage) {
  await requireAdmin()
  if (!STAGES.includes(stage)) return
  await createAdminClient().from("sales_leads").update({ stage }).eq("id", id)
  revalidatePath("/admin/sales")
}

export async function setNextStep(id: string, next_step: string) {
  await requireAdmin()
  await createAdminClient().from("sales_leads").update({ next_step: next_step.trim() || null }).eq("id", id)
  revalidatePath("/admin/sales")
}

export async function setNotes(id: string, notes: string) {
  await requireAdmin()
  await createAdminClient().from("sales_leads").update({ notes: notes.trim() || null }).eq("id", id)
  revalidatePath("/admin/sales")
}
