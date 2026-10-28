"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { REF_COOKIE } from "@/lib/partners"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugify, uniqueSlug, AGENT_DEFAULTS } from "@/lib/agent"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SignupState = {
  error: string
  values: { businessName: string; fullName: string; email: string }
}

// What we ask every new agent to upload before their setup call.
const SETUP_DOCS = ["Your buyer agreement", "Your listing agreement", "Any other forms you send clients"]

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

  // Their booking link is built from their own name (it outlasts a business or brokerage name).
  const slug = await uniqueSlug(slugify(fullName || businessName))
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
    min_notice_hours: AGENT_DEFAULTS.minNoticeHours,
    show_contact: AGENT_DEFAULTS.showContact,
  })
  if (rowErr) {
    // Roll back the auth user so they can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id)
    return fail("Couldn't finish setting up your account. Please try again.")
  }

  // Came through a partner's link? Credit the partner. Coaches' people get a longer free trial.
  try {
    const ref = (await cookies()).get(REF_COOKIE)?.value
    if (ref) {
      const { data: partner } = await admin.from("partners").select("id, email, trial_days").eq("code", ref).eq("status", "active").maybeSingle()
      if (partner?.id && String(partner.email).toLowerCase() !== email) {
        const update: Record<string, string> = { referred_by: partner.id, referred_at: new Date().toISOString() }
        if (partner.trial_days) update.trial_ends_at = new Date(Date.now() + partner.trial_days * 86400000).toISOString()
        await admin.from("agents").update(update).eq("id", created.user.id)
      }
    }
  } catch (err) {
    console.error("[signup] partner credit failed (account still created):", err)
  }

  // Onboarding starts right away: Alecia owns it, and the documents we need before the setup
  // call show up on their dashboard to upload. The team can add or remove documents in Admin.
  try {
    await admin.from("onboarding").upsert({ agent_id: created.user.id, owner: "Alecia" }, { onConflict: "agent_id", ignoreDuplicates: true })
    await admin.from("onboarding_docs").insert(SETUP_DOCS.map((title) => ({ agent_id: created.user.id, title })))
  } catch (err) {
    console.error("[signup] onboarding setup failed (account still created):", err)
  }

  // Log them straight in.
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    // Account exists; just send them to sign in manually.
    redirect("/login")
  }

  // Step two: book the setup call we promise on the home page.
  redirect("/chat?welcome=1")
}
