"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugify, uniqueSlug, AGENT_DEFAULTS } from "@/lib/agent"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignupState = {
  error: string
  values: { businessName: string; fullName: string; email: string }
}

export async function signUp(
  _prev: SignupState | null,
  formData: FormData
): Promise<SignupState> {
  const businessName = String(formData.get("businessName") ?? "").trim()
  const fullName = String(formData.get("fullName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  // Echo back what they typed so a validation error never wipes the form.
  const values = { businessName, fullName, email }
  const fail = (error: string): SignupState => ({ error, values })

  if (!businessName) return fail("Enter your business name.")
  if (!fullName) return fail("Enter your name.")
  if (!emailRe.test(email)) return fail("Enter a valid email address.")
  if (password.length < 8) return fail("Use a password of at least 8 characters.")

  const admin = createAdminClient()

  // Create the agent's login, pre-confirmed (no email step needed).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    const msg = createErr?.message ?? ""
    if (msg.toLowerCase().includes("already")) {
      return fail("An account with that email already exists. Try signing in.")
    }
    return fail("Couldn't create your account. Please try again.")
  }

  // Give them a unique booking-link slug and their profile row.
  const slug = await uniqueSlug(slugify(businessName))
  const { error: rowErr } = await admin.from("agents").insert({
    id: created.user.id,
    business_name: businessName,
    full_name: fullName,
    slug,
    timezone: AGENT_DEFAULTS.timezone,
    weekdays: AGENT_DEFAULTS.weekdays,
    day_start: AGENT_DEFAULTS.startHour,
    day_end: AGENT_DEFAULTS.endHour,
    slot_minutes: AGENT_DEFAULTS.slotMinutes,
    days_ahead: AGENT_DEFAULTS.daysAhead,
  })
  if (rowErr) {
    // Roll back the auth user so they can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id)
    return fail("Couldn't finish setting up your account. Please try again.")
  }

  // Log them straight in.
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    // Account exists; just send them to sign in manually.
    redirect("/login")
  }

  redirect("/dashboard")
}
