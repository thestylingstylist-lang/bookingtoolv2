import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe, CLOSER_PRICE_ID, PAID_STATUSES } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { netAfterFees } from "@/lib/partners"

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

  // Partner program: every payment from a referred agent earns their partner a commission on what
  // Marvberry receives after Stripe fees, for the first 12 payments. Cancelled agents stop paying, so it stops. One commission per invoice, even if Stripe sends the event twice.
  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice
    const paid = inv.amount_paid ?? 0
    if (inv.id && paid > 0 && inv.customer) {
      const { data: agent } = await admin
        .from("agents")
        .select("id, referred_by")
        .eq("stripe_customer_id", String(inv.customer))
        .maybeSingle()
      if (agent?.referred_by) {
        const { data: partner } = await admin
          .from("partners")
          .select("id, commission_pct, commission_months, status")
          .eq("id", agent.referred_by)
          .maybeSingle()
        if (partner && partner.status === "active") {
          const { count } = await admin
            .from("partner_commissions")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", agent.id)
          if ((count ?? 0) < partner.commission_months) {
            await admin.from("partner_commissions").upsert(
              {
                partner_id: partner.id,
                agent_id: agent.id,
                stripe_invoice_id: inv.id,
                amount_cents: paid,
                commission_cents: Math.round((netAfterFees(paid) * partner.commission_pct) / 100),
              },
              { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
            )
          }
        }
      }
    }
  }

  // A refunded payment takes back the commission on it, if it hasn't been paid out yet.
  if (event.type === "charge.refunded") {
    const ch = event.data.object as Stripe.Charge
    if (ch.customer && ch.amount_refunded > 0) {
      const { data: agent } = await admin.from("agents").select("id, referred_by").eq("stripe_customer_id", String(ch.customer)).maybeSingle()
      if (agent?.referred_by) {
        const { data: c } = await admin
          .from("partner_commissions")
          .select("id")
          .eq("agent_id", agent.id)
          .eq("amount_cents", ch.amount)
          .is("paid_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (c?.id) await admin.from("partner_commissions").delete().eq("id", c.id)
      }
    }
  }

  return NextResponse.json({ received: true })
}
