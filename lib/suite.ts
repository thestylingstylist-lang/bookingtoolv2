// The client's private page is their "suite", named for the kind of client
// the agent picked. Plain module, safe for server and client code.
import type { Journey } from "./phases"

export type ClientType = "buyer" | "seller" | "investor" | "both"

export function toClientType(v: unknown): ClientType | null {
  return v === "buyer" || v === "seller" || v === "investor" || v === "both" ? v : null
}

// "buyer suite", "seller suite", "investor suite", or "private suite" for
// buyer-and-seller clients and clients with no type picked yet.
export function suiteName(v: unknown) {
  const t = toClientType(v)
  if (t === "buyer" || t === "seller" || t === "investor") return `${t} suite`
  return "private suite"
}

// Buyers, investors and clients with no type follow the buying journey.
// Sellers follow the selling journey. Buyer-and-seller clients get both.
export function journeysFor(v: unknown): Journey[] {
  const t = toClientType(v)
  if (t === "seller") return ["sell"]
  if (t === "both") return ["buy", "sell"]
  return ["buy"]
}

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  buyer: "Buyer",
  seller: "Seller",
  investor: "Investor",
  both: "Buyer and seller",
}
