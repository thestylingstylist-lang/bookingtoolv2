"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe, siteUrl } from "@/lib/stripe"

const SETUP_PRICE_CENTS = 99700

// "Yes, set it all up for me": a one-time payment on Stripe's secure page.
// After paying, they book their kickoff call (step two of signup).
export async function buySetup() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/signup")
  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("agents")
    .select("id, full_name, business_name, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!agent) redirect("/login")

  const s = stripe()
  let customer = agent.stripe_customer_id as string | null
  if (!customer) {
    const c = await s.customers.create({
      email: user.email ?? undefined,
      name: agent.full_name || agent.business_name || undefined,
      metadata: { agent_id: agent.id },
    })
    customer = c.id
    await admin.from("agents").update({ stripe_customer_id: customer }).eq("id", agent.id)
  }

  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: agent.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SETUP_PRICE_CENTS,
          product_data: { name: "Marvberry done-for-you setup", description: "Your whole client experience, set up for you in 7 days." },
        },
      },
    ],
    metadata: { kind: "setup", agent_id: agent.id },
    payment_intent_data: { metadata: { kind: "setup", agent_id: agent.id } },
    success_url: `${siteUrl()}/chat?welcome=1&paid=1`,
    cancel_url: `${siteUrl()}/setup?offer=1`,
  })
  redirect(session.url!)
}
