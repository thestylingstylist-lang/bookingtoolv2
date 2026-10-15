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

  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
  if (error) {
    // Say what actually went wrong, so nobody is sent off for a new link they don't need.
    const code = (error as { code?: string }).code ?? ""
    if (code === "same_password") return { error: "That's already your password. Pick a different one, or just sign in with it." }
    if (code === "weak_password") return { error: error.message || "Pick a stronger password, with letters and numbers." }
    console.error("[reset-password] updateUser failed:", code, error.message)
    return { error: "Couldn't save that password. Try once more. If it keeps happening, reply to your email and we'll get you in." }
  }

  redirect("/dashboard")
}
