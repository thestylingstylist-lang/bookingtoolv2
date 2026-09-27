"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe, siteUrl, SOLO_PRICE_ID } from "@/lib/stripe"

async function currentAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await createAdminClient()
    .from("agents")
    .select("id, full_name, business_name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!data) redirect("/login")
  return { agent: data, email: user.email ?? "" }
}

// Send the realtor to Stripe's secure checkout page.
export async function startCheckout() {
  const { agent, email } = await currentAgent()
  const s = stripe()

  let customer = agent.stripe_customer_id as string | null
  if (!customer) {
    const c = await s.customers.create({
      email,
      name: agent.full_name || agent.business_name || undefined,
      metadata: { agent_id: agent.id },
    })
    customer = c.id
    await createAdminClient().from("agents").update({ stripe_customer_id: customer }).eq("id", agent.id)
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
  redirect(session.url!)
}

// Stripe's own page for changing cards, invoices, and cancelling.
export async function openBillingPortal() {
  const { agent } = await currentAgent()
  if (!agent.stripe_customer_id) redirect("/billing")
  const session = await stripe().billingPortal.sessions.create({
    customer: agent.stripe_customer_id,
    return_url: `${siteUrl()}/billing`,
  })
  redirect(session.url)
}
