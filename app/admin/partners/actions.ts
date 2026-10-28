"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { sendEmail } from "@/lib/email"
import { codeFrom, COACH_TRIAL_DAYS, COMMISSION_PCT, COMMISSION_MONTHS } from "@/lib/partners"

async function guard() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")
  return createAdminClient()
}

// Approve: give them a link code, turn it on, and email them their link and private page.
export async function approvePartner(formData: FormData) {
  const admin = await guard()
  const id = String(formData.get("id") ?? "")
  const { data: p } = await admin.from("partners").select("id, name, email, kind").eq("id", id).maybeSingle()
  if (!p) return

  let base = codeFrom(String(formData.get("code") ?? "") || p.name)
  let code = base
  for (let n = 2; n < 50; n++) {
    const { data: taken } = await admin.from("partners").select("id").eq("code", code).neq("id", id).maybeSingle()
    if (!taken) break
    code = `${base}${n}`
  }
  const { data: row } = await admin
    .from("partners")
    .update({ status: "active", code, approved_at: new Date().toISOString(), trial_days: p.kind === "coach" ? COACH_TRIAL_DAYS : null })
    .eq("id", id)
    .select("dashboard_token")
    .maybeSingle()

  const link = `https://www.marvberry.com/r/${code}`
  const page = `https://www.marvberry.com/partners/${row?.dashboard_token}`
  const first = String(p.name).split(" ")[0]
  const coachLine = p.kind === "coach" ? ` And anyone who signs up through your link gets ${COACH_TRIAL_DAYS} days free instead of 14.` : ""
  try {
    await sendEmail({
      to: p.email,
      subject: "You're a Marvberry partner",
      html: `<p>Hi ${first},</p><p>You're in! Here's your link:</p><p><a href="${link}"><strong>${link}</strong></a></p><p>Every agent who signs up through it earns you ${COMMISSION_PCT}% of what Marvberry receives after payment fees (about $19 a month on the $67 plan), every month they pay, for up to ${COMMISSION_MONTHS} months. If they cancel, the commission on them stops.${coachLine}</p><p>Your private page shows your clicks, signups and earnings. Bookmark it:<br><a href="${page}">${page}</a></p><p>One rule from the FTC: when you share the link, say it's an affiliate link. Something like "I get a commission if you sign up" works.</p><p>Reply to this email with how you'd like to be paid, PayPal or bank transfer.</p><p>Thank you,<br>Alecia<br>Founder, Marvberry</p>`,
      text: `Hi ${first},\n\nYou're in! Here's your link:\n${link}\n\nEvery agent who signs up through it earns you ${COMMISSION_PCT}% of what Marvberry receives after payment fees (about $19 a month on the $67 plan), every month they pay, for up to ${COMMISSION_MONTHS} months. If they cancel, the commission on them stops.${coachLine}\n\nYour private page shows your clicks, signups and earnings. Bookmark it:\n${page}\n\nOne rule from the FTC: when you share the link, say it's an affiliate link. Something like "I get a commission if you sign up" works.\n\nReply to this email with how you'd like to be paid, PayPal or bank transfer.\n\nThank you,\nAlecia\nFounder, Marvberry`,
      fromName: "Alecia at Marvberry",
      replyTo: "team@marvberry.com",
    })
  } catch {}
  revalidatePath("/admin/partners")
}

export async function declinePartner(formData: FormData) {
  const admin = await guard()
  await admin.from("partners").update({ status: "declined" }).eq("id", String(formData.get("id") ?? ""))
  revalidatePath("/admin/partners")
}

export async function savePayout(formData: FormData) {
  const admin = await guard()
  const payout = String(formData.get("payout") ?? "").trim().slice(0, 200)
  await admin.from("partners").update({ payout_method: payout || null }).eq("id", String(formData.get("id") ?? ""))
  revalidatePath("/admin/partners")
}

// After you've sent the money: mark everything they're owed as paid.
export async function markPaid(formData: FormData) {
  const admin = await guard()
  await admin
    .from("partner_commissions")
    .update({ paid_at: new Date().toISOString() })
    .eq("partner_id", String(formData.get("id") ?? ""))
    .is("paid_at", null)
  revalidatePath("/admin/partners")
}

// Remove a partner completely (for tests or someone you stop working with): their clicks and
// earnings go too, and agents they referred stay as normal agents with no partner.
export async function deletePartner(formData: FormData) {
  const admin = await guard()
  await admin.from("partners").delete().eq("id", String(formData.get("id") ?? ""))
  revalidatePath("/admin/partners")
}
