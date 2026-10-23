import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe, CLOSER_PRICE_ID, PAID_STATUSES } from "@/lib/stripe"
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

    // Closer plan: the assistant comes with it. Turn it on while they're on
    // Closer, and off when they leave Closer (moving to Agent, or cancelling).
    const onCloser = sub.items.data.some((i) => i.price.id === CLOSER_PRICE_ID)
    const prev = (event.data as { previous_attributes?: { items?: { data?: { price?: { id?: string } }[] } } }).previous_attributes
    const wasCloser = !!prev?.items?.data?.some((i) => i.price?.id === CLOSER_PRICE_ID)
    const { data: who } = await admin.from("agents").select("id").eq("stripe_customer_id", sub.customer as string).maybeSingle()
    if (who?.id) {
      const active = PAID_STATUSES.includes(sub.status) && event.type !== "customer.subscription.deleted"
      if (onCloser && active) await admin.from("assistant_plans").upsert({ agent_id: who.id })
      else if (onCloser || wasCloser) await admin.from("assistant_plans").delete().eq("agent_id", who.id)
    }
  }

  return NextResponse.json({ received: true })
}
