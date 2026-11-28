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

// "Protect your signature" → Claim your card. Her Marvberry Card (which is her booking page),
// free, no trial and no payment, made from what she entered. The back office comes with Diana.

export type SignatureClaim = { error: string }

const HEX = /^#[0-9a-f]{6}$/i

export async function claimSignature(_prev: SignatureClaim | null, formData: FormData): Promise<SignatureClaim> {
  const fullName = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
  const brokerage = String(formData.get("brokerage") ?? "").trim().replace(/\s+/g, " ").slice(0, 120)
  const photoKind = formData.get("photoKind") === "headshot" ? "headshot" : "logo"
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40)
  const colorIn = String(formData.get("color") ?? "").trim()
  const color = HEX.test(colorIn) ? colorIn.toLowerCase() : ""
  const image = formData.get("logo")

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
    business_name: brokerage || fullName,
    full_name: fullName,
    slug,
    // the free card: her card and its booking page, no trial clock
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
  let imageUrl = ""
  if (image instanceof File && image.size > 0) {
    try {
      imageUrl = (await uploadImage(id, photoKind, image)) ?? ""
      if (imageUrl) await save(photoKind === "headshot" ? { headshot_url: imageUrl } : { logo_url: imageUrl })
    } catch (e) {
      console.error("[claim] image failed", e)
    }
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
        text: `Hi ${first},\n\nYour card is live: https://www.marvberry.com/book/${slug}\n\nChoose a password so you can sign in on any device:\n${url}\n\nIt's yours, free. Just from us to you.\n\nThe Marvberry team`,
        html: teamNote(
          `Your card is live, ${esc(first)}.`,
          para(`Here it is: <a href="https://www.marvberry.com/book/${slug}">marvberry.com/book/${esc(slug)}</a>. It's yours, free. Just from us to you.`) +
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
      text: `${fullName} claimed a free card from the home page.\nBrokerage: ${brokerage || "-"}\nEmail: ${email}\nPhone: ${phone}\nCard: https://www.marvberry.com/book/${slug}`,
      html: teamNote(
        "A new card was claimed.",
        para(`${esc(fullName)} built and claimed a free card from the home page.`) +
          details([
            ["Brokerage", esc(brokerage || "-")],
            ["Email", esc(email)],
            ["Phone", esc(phone)],
            [photoKind === "headshot" ? "Headshot" : "Logo", imageUrl ? "Uploaded" : "None yet"],
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
