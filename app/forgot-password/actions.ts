"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ForgotState = { sent: boolean; error: string }

export async function requestReset(
  _prev: ForgotState | null,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!emailRe.test(email)) return { sent: false, error: "Enter a valid email address." }

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const origin = `${proto}://${host}`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error && error.status === 429) {
    return { sent: false, error: "Too many requests. Wait a few minutes and try again." }
  }
  // Same message whether or not the account exists, so nobody can fish for emails.
  return { sent: true, error: "" }
}
