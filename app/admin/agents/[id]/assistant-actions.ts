"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { stripe, siteUrl, SOLO_PRICE_ID } from "@/lib/stripe"
import { sendEmail } from "@/lib/email"
import { sendResetEmail } from "@/lib/password-reset"
import { letterHtml, para, button, small } from "@/lib/letter"

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
  const html = letterHtml({
    eyebrow: "Marvberry",
    heading: "Let&rsquo;s make it official.",
    body:
      para(`Hi ${first},`) +
      para("Here&rsquo;s your link to start your Marvberry membership. It&rsquo;s $39 a month, and you have 30 days to get every dollar back if it isn&rsquo;t right for you.") +
      button(url!, "Start my membership") +
      small("The link is good for 24 hours. If it runs out, just reply and I&rsquo;ll send a fresh one."),
    signoff: "Talk soon,",
    signature: "Alecia",
    role: "Founder, Marvberry",
    footer: "Marvberry. Move forward.",
  })
  const ok = await sendEmail({ to: email, subject: "Your Marvberry membership link", html, text, fromName: "Alecia at Marvberry", replyTo: "team@marvberry.com" })
  redirect(`/admin/agents/${agentId}?pay=${ok ? "sent" : "made"}&at=${Date.now()}&payurl=${encodeURIComponent(url)}`)
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

  const ok = (await sendResetEmail(email!)) === "sent"
  redirect(`/admin/agents/${agentId}?reset=${ok ? "sent" : "fail"}&at=${Date.now()}`)
}

// A temporary password the team reads to a realtor who's stuck. It also confirms
// their email, and flags the account so they choose their own password on sign-in.
export type TempResult = { password?: string; error?: string }

export async function makeTempPassword(_prev: TempResult | null, formData: FormData): Promise<TempResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { error: "Not allowed." }

  const agentId = String(formData.get("agentId") ?? "")
  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(agentId)
  if (!u?.user?.email || isAdminEmail(u.user.email)) return { error: "Couldn't find that account." }

  // Easy to read out loud: no 0/O or 1/l look-alikes.
  const abc = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const chunk = (a: number, b: number) => Array.from(bytes.slice(a, b), (x) => abc[x % abc.length]).join("")
  const password = `Marv-${chunk(0, 4)}-${chunk(4, 8)}`

  const { error } = await admin.auth.admin.updateUserById(agentId, {
    password,
    email_confirm: true,
    user_metadata: { ...(u.user.user_metadata ?? {}), must_change_password: true },
  })
  if (error) return { error: "That didn't work. Try again." }
  return { password }
}
