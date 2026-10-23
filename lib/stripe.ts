import "server-only"
import Stripe from "stripe"

// The two plans (live prices in Stripe).
export const AGENT_PRICE_ID = "price_1UTWI2LvX8KV0Gh8TrwdNR9l" // Agent, $67/month
export const CLOSER_PRICE_ID = "price_1UTWNELvX8KV0Gh8Ii4CV4pC" // Marvberry Closer, $147/month
// Early members who signed up at $39 keep it (no longer offered).
export const LEGACY_PRICE_ID = "price_1UKGfgLvX8KV0Gh8MzxuEPta"
// The default plan for a new sign-up.
export const SOLO_PRICE_ID = AGENT_PRICE_ID

export type PlanKey = "agent" | "closer"
export const PLANS: Record<PlanKey, { name: string; price: string; priceId: string }> = {
  agent: { name: "Agent", price: "$67", priceId: AGENT_PRICE_ID },
  closer: { name: "Closer", price: "$147", priceId: CLOSER_PRICE_ID },
}

// What a Stripe price id means, for showing someone their plan.
export function planForPrice(id: string | null | undefined): { name: string; price: string } | null {
  if (id === AGENT_PRICE_ID) return PLANS.agent
  if (id === CLOSER_PRICE_ID) return PLANS.closer
  if (id === LEGACY_PRICE_ID) return { name: "Agent (founding)", price: "$39" }
  return null
}

// Statuses that count as "paid up". past_due keeps access while Stripe retries the card.
export const PAID_STATUSES = ["active", "trialing", "past_due"]

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://marvberry.com"
}
