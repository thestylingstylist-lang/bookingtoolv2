"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { stripe } from "@/lib/stripe"

async function guard() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  return !!user && isAdminEmail(user.email)
}

// Their live Stripe subscriptions, if they pay.
async function subsOf(agentId: string) {
  const { data } = await createAdminClient().from("agents").select("stripe_customer_id").eq("id", agentId).maybeSingle()
  const customer = data?.stripe_customer_id as string | undefined
  if (!customer) return []
  const list = await stripe().subscriptions.list({ customer, status: "all", limit: 20 })
  return list.data.filter((s) => ["active", "trialing", "past_due", "unpaid"].includes(s.status))
}

// Suspend: they can't sign in and their booking page is hidden. Nothing is lost.
export async function setSuspended(agentId: string, on: boolean): Promise<string> {
  if (!(await guard())) return "Team only."
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(agentId, { ban_duration: on ? "876000h" : "none" })
  if (error) return "Couldn’t change their access. Try again."
  await admin.from("agents").update({ suspended_at: on ? new Date().toISOString() : null }).eq("id", agentId)
  revalidatePath(`/admin/agents/${agentId}`)
  revalidatePath("/admin/agents")
  return on ? "Suspended. They can’t sign in, and their booking page is hidden." : "Turned back on."
}

// Cancel: their subscription ends at the close of the period they paid for.
export async function cancelSubscription(agentId: string): Promise<string> {
  if (!(await guard())) return "Team only."
  try {
    const subs = await subsOf(agentId)
    if (!subs.length) return "They don’t have a paid subscription to cancel."
    for (const s of subs) await stripe().subscriptions.update(s.id, { cancel_at_period_end: true })
    revalidatePath(`/admin/agents/${agentId}`)
    return "Canceled. They keep access until the period they paid for ends."
  } catch {
    return "Stripe didn’t accept that. Try again, or cancel it in Stripe."
  }
}

// Delete: the account and everything in it, for good. Any subscription stops now.
export async function deleteAccount(agentId: string): Promise<string> {
  if (!(await guard())) return "Team only."
  try {
    for (const s of await subsOf(agentId)) await stripe().subscriptions.cancel(s.id)
  } catch {
    return "Couldn’t stop their Stripe subscription, so nothing was deleted. Cancel it in Stripe first."
  }
  const { error } = await createAdminClient().auth.admin.deleteUser(agentId)
  if (error) return "Couldn’t delete the account. Try again."
  revalidatePath("/admin/agents")
  redirect("/admin/agents")
}
