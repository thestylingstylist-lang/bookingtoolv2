import "server-only"
import Stripe from "stripe"

// Solo Agent, $39/month (live price in Stripe).
export const SOLO_PRICE_ID = process.env.STRIPE_PRICE_ID || "price_1UKGfgLvX8KV0Gh8MzxuEPta"

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
