"use server"

import { randomBytes } from "crypto"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { slugify, uniqueSlug, AGENT_DEFAULTS } from "@/lib/agent"
import { checkEmail } from "@/lib/email-check"
import { uploadImage } from "@/lib/branding"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, small, details, esc } from "@/lib/letter"

// "Protect your signature" → Claim. One step: her card (which is her booking page) and her
// back office, made from what she entered on the home page, with 7 days of full access.

export type SignatureClaim = { error: string }

const TRIAL_DAYS = 7
const SETUP_DOCS = ["Your buyer agreement", "Your listing agreement", "Any other forms you send clients"]
const HEX = /^#[0-9a-f]{6}$/i

export async function claimSignature(_prev: SignatureClaim | null, formData: FormData): Promise<SignatureClaim> {
  const fullName = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40)
  const colorIn = String(formData.get("color") ?? "").trim()
  const color = HEX.test(colorIn) ? colorIn.toLowerCase() : ""
  const logo = formData.get("logo")

  if (!fullName) return { error: "Type your name first, so your card has it." }
  const bad = await checkEmail(email)
  if (bad) return { error: bad }
  if (phone.replace(/\D/g, "").length < 7) return { error: "Enter a phone number your clients can reach you on." }

  const admin = createAdminClient()
  // No password to think about today: she's signed in now and gets a link to choose one.
  const password = randomBytes(24).toString("base64url")
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !created.user) {
    if ((error?.message ?? "").toLowerCase().includes("already")) return { error: "You already have a Marvberry account with that email. Sign in to see your card." }
    return { error: "That didn’t go through. Please try again." }
  }
  const id = created.user.id

  const slug = await uniqueSlug(slugify(fullName))
  const { error: rowErr } = await admin.from("agents").insert({
    id,
    business_name: fullName,
    full_name: fullName,
    slug,
    trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
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
    await admin.auth.admin.deleteUser(id)
    return { error: "That didn’t go through. Please try again." }
  }

  // Everything else she entered. Each saved on its own, so one hiccup never costs her the account.
  const save = async (fields: Record<string, string>) => {
    try {
      await admin.from("agents").update(fields).eq("id", id)
    } catch (e) {
      console.error("[claim] save failed", Object.keys(fields), e)
    }
  }
  await save({ public_phone: phone, public_email: email })
  if (color) await save({ brand_color: color })
  let logoUrl = ""
  if (logo instanceof File && logo.size > 0) {
    try {
      logoUrl = (await uploadImage(id, "logo", logo)) ?? ""
      if (logoUrl) await save({ logo_url: logoUrl })
    } catch (e) {
      console.error("[claim] logo failed", e)
    }
  }
  try {
    await admin.from("onboarding").upsert({ agent_id: id, owner: "Alecia" }, { onConflict: "agent_id", ignoreDuplicates: true })
    await admin.from("onboarding_docs").insert(SETUP_DOCS.map((title) => ({ agent_id: id, title })))
  } catch (e) {
    console.error("[claim] onboarding failed", e)
  }

  // Her link to choose a password, so she can come back on any device.
  try {
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email })
    const hash = data?.properties?.hashed_token
    if (hash) {
      const url = `https://www.marvberry.com/auth/callback?token_hash=${encodeURIComponent(hash)}&type=recovery&next=/reset-password`
      const first = fullName.split(" ")[0]
      await sendEmail({
        to: email,
        subject: "Your Marvberry card is live",
        fromName: "Marvberry",
        replyTo: "team@marvberry.com",
        text: `Hi ${first},\n\nYour card is live: https://www.marvberry.com/book/${slug}\n\nChoose a password so you can sign in on any device:\n${url}\n\nYou have 7 days of full access.\n\nThe Marvberry team`,
        html: teamNote(
          `Your card is live, ${esc(first)}.`,
          para(`Here it is: <a href="https://www.marvberry.com/book/${slug}">marvberry.com/book/${esc(slug)}</a>. You have 7 days of full access.`) +
            button(url, "Choose your password") +
            small("Choose a password so you can sign in on any device. The link works once."),
        ),
      })
    }
  } catch (e) {
    console.error("[claim] welcome email failed", e)
  }

  // Tell Alecia.
  try {
    await sendEmail({
      to: "team@marvberry.com",
      subject: `New card claimed: ${fullName}`,
      fromName: "Marvberry",
      text: `${fullName} claimed a card from the home page.\nEmail: ${email}\nPhone: ${phone}\nCard: https://www.marvberry.com/book/${slug}\n7-day access ends ${new Date(Date.now() + TRIAL_DAYS * 86400000).toDateString()}.`,
      html: teamNote(
        "A new card was claimed.",
        para(`${esc(fullName)} built and claimed a card from the home page.`) +
          details([
            ["Email", esc(email)],
            ["Phone", esc(phone)],
            ["Logo", logoUrl ? "Uploaded" : "None yet"],
            ["Colour", color || "Default"],
          ]) +
          button(`https://www.marvberry.com/book/${slug}`, "See the card"),
      ),
    })
  } catch (e) {
    console.error("[claim] team email failed", e)
  }

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) redirect("/login")
  redirect("/my-card?new=1")
}
