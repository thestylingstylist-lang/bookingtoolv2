"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function setNewPassword(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (password.length < 8) return { error: "Use a password of at least 8 characters." }
  if (password !== confirm) return { error: "Those passwords don't match." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/forgot-password?error=link")

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: "Couldn't update your password. Request a new link and try again." }

  redirect("/dashboard")
}
