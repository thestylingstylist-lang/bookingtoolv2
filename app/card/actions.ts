"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugify, uniqueSlug, AGENT_DEFAULTS } from "@/lib/agent"
import { checkEmail } from "@/lib/email-check"

export type ClaimState = { error: string; values: { fullName: string; email: string } }

// Claim a free Marvberry Card: a free account that sees Card, Calendar and
// Clients, with no trial clock. Marvberry is there later, if they want help.
export async function claimCard(_prev: ClaimState | null, formData: FormData): Promise<ClaimState> {
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 120)
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const values = { fullName, email }
  const fail = (error: string): ClaimState => ({ error, values })

  if (!fullName) return fail("Enter your name.")
  const bad = await checkEmail(email)
  if (bad) return fail(bad)
  if (password.length < 8) return fail("Use a password of at least 8 characters.")

  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !created.user) {
    if ((error?.message ?? "").toLowerCase().includes("already")) return fail("You already have an account with that email. Sign in instead.")
    return fail("Couldn’t create your card. Please try again.")
  }

  const slug = await uniqueSlug(slugify(fullName))
  const { error: rowErr } = await admin.from("agents").insert({
    id: created.user.id,
    business_name: fullName,
    full_name: fullName,
    slug,
    plan: "card",
    trial_ends_at: null,
    timezone: AGENT_DEFAULTS.timezone,
    weekdays: AGENT_DEFAULTS.weekdays,
    day_start: AGENT_DEFAULTS.startHour,
    day_end: AGENT_DEFAULTS.endHour,
    slot_minutes: AGENT_DEFAULTS.slotMinutes,
    days_ahead: AGENT_DEFAULTS.daysAhead,
    min_notice_hours: AGENT_DEFAULTS.minNoticeHours,
    show_contact: AGENT_DEFAULTS.showContact,
  })
  if (rowErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return fail("Couldn’t finish setting up your card. Please try again.")
  }

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) redirect("/login")
  redirect("/my-card?new=1")
}
