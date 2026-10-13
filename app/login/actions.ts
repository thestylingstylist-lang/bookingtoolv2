"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin"

export async function signIn(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Enter your email and password." }
  }

  const team = formData.get("team") === "1"
  if (team && !isAdminEmail(email)) {
    return { error: "This login is for the Marvberry team. Realtors log in at marvberry.com/login." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "That email or password didn't match. Try again." }
  }

  // The team account goes straight to admin; realtors go to their dashboard.
  redirect(isAdminEmail(email) ? "/admin" : "/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
