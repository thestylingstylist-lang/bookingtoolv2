"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkEmail } from "@/lib/email-check"

export type ClaimGiftState = { error: string; email: string }

// She takes over the card made for her: her email and password replace the
// placeholder login, and the card goes live as hers.
export async function claimGift(token: string, _prev: ClaimGiftState | null, formData: FormData): Promise<ClaimGiftState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const fail = (error: string): ClaimGiftState => ({ error, email })
  const bad = await checkEmail(email)
  if (bad) return fail(bad)
  if (password.length < 8) return fail("Use a password of at least 8 characters.")

  const admin = createAdminClient()
  const { data: agent } = await admin.from("agents").select("id, public_email").eq("claim_token", token).maybeSingle()
  if (!agent) return fail("This card has already been claimed. Sign in to see it.")

  const { error } = await admin.auth.admin.updateUserById(agent.id as string, { email, password, email_confirm: true })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return fail("That email already has a Marvberry account. Use another, or sign in.")
    return fail("Couldn’t claim your card. Please try again.")
  }
  await admin
    .from("agents")
    .update({ claim_token: null, ...(agent.public_email ? {} : { public_email: email }) })
    .eq("id", agent.id)

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) redirect("/login")
  redirect("/my-card?new=1")
}
