"use server"

import { sendResetEmail } from "@/lib/password-reset"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ForgotState = { sent: boolean; error: string }

export async function requestReset(
  _prev: ForgotState | null,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!emailRe.test(email)) return { sent: false, error: "Enter a valid email address." }

  const result = await sendResetEmail(email)
  if (result === "fail") {
    return { sent: false, error: "That didn't go through. Wait a minute and try again." }
  }
  // Same message whether or not the account exists, so nobody can fish for emails.
  return { sent: true, error: "" }
}
