import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

// Stripe tells us when someone pays, changes plan, or cancels.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get("stripe-signature")
  if (!secret || !sig) return NextResponse.json({ error: "not configured" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret)
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.client_reference_id) {
      await admin
        .from("agents")
        .update({ stripe_customer_id: s.customer as string, subscription_status: "active" })
        .eq("id", s.client_reference_id)
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription
    await admin
      .from("agents")
      .update({ subscription_status: sub.status })
      .eq("stripe_customer_id", sub.customer as string)
  }

  return NextResponse.json({ received: true })
}
