"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { stripe, siteUrl, SOLO_PRICE_ID } from "@/lib/stripe"
import { sendEmail } from "@/lib/email"

// The team turns Marvberry Assistant on or off for one realtor.
export async function setAssistantPlan(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const on = formData.get("on") === "1"
  if (!agentId) return

  const admin = createAdminClient()
  if (on) await admin.from("assistant_plans").upsert({ agent_id: agentId })
  else await admin.from("assistant_plans").delete().eq("agent_id", agentId)
  revalidatePath(`/admin/agents/${agentId}`)
}

// The team gives a realtor more trial time, for customer service. Days are
// added from today if the trial already ended, or from its end date if not.
export async function extendTrial(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const days = Number(formData.get("days") ?? 0)
  if (!agentId || !Number.isFinite(days) || days < 1 || days > 365) return

  const admin = createAdminClient()
  const { data: agent } = await admin.from("agents").select("trial_ends_at").eq("id", agentId).maybeSingle()
  const current = agent?.trial_ends_at ? new Date(agent.trial_ends_at as string).getTime() : 0
  const from = Math.max(current, Date.now())
  const ends = new Date(from + days * 86_400_000).toISOString()
  await admin.from("agents").update({ trial_ends_at: ends }).eq("id", agentId)
  revalidatePath(`/admin/agents/${agentId}`)
  revalidatePath("/admin/agents")
}

// The team makes a one-time link that signs into this realtor's own account,
// so setup can be done for them on a call. Single use, expires within the hour.
export async function makeSetupLink(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  if (!agentId) return
  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(agentId)
  const email = u?.user?.email
  if (!email || isAdminEmail(email)) redirect(`/admin/agents/${agentId}?setup=fail`)

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) redirect(`/admin/agents/${agentId}?setup=fail`)
  redirect(`/admin/agents/${agentId}?setup=${encodeURIComponent(hash)}`)
}

// The team sends a realtor a secure Stripe payment link for Solo Agent ($39/month).
// Emailed to them from Alecia, and shown here to copy. Good for 24 hours.
export async function sendPaymentLink(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const admin = createAdminClient()
  const [{ data: agent }, { data: u }] = await Promise.all([
    admin.from("agents").select("id, full_name, business_name, stripe_customer_id").eq("id", agentId).maybeSingle(),
    admin.auth.admin.getUserById(agentId),
  ])
  const email = u?.user?.email
  if (!agent || !email) redirect(`/admin/agents/${agentId}?pay=fail`)

  let url: string | null = null
  try {
    const s = stripe()
    let customer = agent.stripe_customer_id as string | null
    if (!customer) {
      const c = await s.customers.create({
        email,
        name: agent.full_name || agent.business_name || undefined,
        metadata: { agent_id: agent.id },
      })
      customer = c.id
      await admin.from("agents").update({ stripe_customer_id: customer }).eq("id", agent.id)
    }
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: agent.id,
      line_items: [{ price: SOLO_PRICE_ID, quantity: 1 }],
      success_url: `${siteUrl()}/dashboard?welcome=paid`,
      cancel_url: `${siteUrl()}/billing`,
      allow_promotion_codes: true,
    })
    url = session.url
  } catch (e) {
    console.error("[admin] payment link failed", e)
  }
  if (!url) redirect(`/admin/agents/${agentId}?pay=fail`)

  const first = ((agent.full_name as string) || "").trim().split(/\s+/)[0] || "there"
  const text = `Hi ${first},\n\nHere's your link to make Marvberry official. It's $39 a month, and you have 30 days to get every dollar back if it isn't right for you.\n\n${url}\n\nThe link is good for 24 hours. If it runs out, just reply and I'll send a fresh one.\n\nAlecia`
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#2a221c;max-width:520px">
<p>Hi ${first},</p>
<p>Here's your link to make Marvberry official. It's $39 a month, and you have 30 days to get every dollar back if it isn't right for you.</p>
<p style="margin:28px 0"><a href="${url}" style="background:#2a221c;color:#f6efe5;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Arial,sans-serif;font-size:15px">Start my membership</a></p>
<p>The link is good for 24 hours. If it runs out, just reply and I'll send a fresh one.</p>
<p>Alecia</p></div>`
  const ok = await sendEmail({ to: email, subject: "Your Marvberry membership link", html, text, fromName: "Alecia at Marvberry", replyTo: "team@marvberry.com" })
  redirect(`/admin/agents/${agentId}?pay=${ok ? "sent" : "made"}&payurl=${encodeURIComponent(url)}`)
}

// The team sends a realtor a link to choose a new password. Emailed from Marvberry.
export async function sendPasswordReset(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const agentId = String(formData.get("agentId") ?? "")
  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(agentId)
  const email = u?.user?.email
  if (!email || isAdminEmail(email)) redirect(`/admin/agents/${agentId}?reset=fail`)

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) redirect(`/admin/agents/${agentId}?reset=fail`)

  const url = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(hash)}&type=recovery&next=/reset-password`
  const text = `Hi,\n\nHere's your link to set a new password for Marvberry:\n\n${url}\n\nIt works once and expires within the hour. If you didn't ask for this, you can ignore it.\n\nThe Marvberry team`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2a221c;max-width:520px">
<p>Hi,</p><p>Here's your link to set a new password for Marvberry.</p>
<p style="margin:26px 0"><a href="${url}" style="background:#2a221c;color:#f6efe5;text-decoration:none;padding:12px 24px;border-radius:999px">Set a new password</a></p>
<p>It works once and expires within the hour. If you didn't ask for this, you can ignore it.</p><p>The Marvberry team</p></div>`
  const ok = await sendEmail({ to: email, subject: "Set a new Marvberry password", html, text, fromName: "Marvberry", replyTo: "team@marvberry.com" })
  redirect(`/admin/agents/${agentId}?reset=${ok ? "sent" : "fail"}`)
}
