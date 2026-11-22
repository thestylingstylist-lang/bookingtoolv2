// The deal workflow: the phases a client moves through, and the standard
// checklist for each. Plain module, safe to import from server and client code.

// Buyers (and investors) move through the buying journey; sellers through the
// selling journey. "Buyer and seller" clients have both at once. Selling keys
// carry their own names so the two never mix in the steps table.
export type BuyPhase = "preparing" | "showing" | "offer" | "contract" | "closing"
export type SellPhase = "s_preparing" | "listing" | "open_house" | "offers" | "s_contract" | "s_closing"
export type Phase = BuyPhase | SellPhase
export type Journey = "buy" | "sell"

// Who is responsible for a step. The client only ever ticks nothing themselves;
// the realtor marks everything. But the tag tells the client who they're waiting
// on, which is the whole point of the portal.
export type Owner = "agent" | "client" | "lawyer" | "lender" | "selling_agent"

export const OWNER_LABEL: Record<Owner, string> = {
  agent: "You",
  client: "Client",
  lawyer: "Lawyer",
  lender: "Lender",
  selling_agent: "Seller's agent",
}

// What the CLIENT sees for each owner, from their point of view.
export const OWNER_LABEL_CLIENT: Record<Owner, string> = {
  agent: "Your agent",
  client: "Your turn",
  lawyer: "Your attorney",
  lender: "Lender",
  selling_agent: "Seller's agent",
}

export type StepDef = { title: string; owner: Owner }

export const BUY_PHASES: { key: BuyPhase; label: string; steps: StepDef[] }[] = [
  {
    key: "preparing",
    label: "Preparing",
    steps: [
      { title: "Consultation", owner: "agent" },
      { title: "Ask what they're looking for", owner: "agent" },
      { title: "Buyer sent their criteria", owner: "client" },
      { title: "Pre-approval or proof of funds", owner: "client" },
    ],
  },
  {
    key: "showing",
    label: "Showing",
    steps: [
      { title: "Agreement signed", owner: "client" },
      { title: "Send curated homes", owner: "agent" },
      { title: "Get their availability", owner: "client" },
      { title: "Set up viewings", owner: "agent" },
    ],
  },
  {
    key: "offer",
    label: "Offer",
    steps: [
      { title: "Collect the client's documents", owner: "client" },
      { title: "Put together the offer packet", owner: "agent" },
      { title: "Send the offer to the seller's agent", owner: "agent" },
      { title: "Hear back from the seller's agent", owner: "selling_agent" },
    ],
  },
  {
    key: "contract",
    label: "Contract",
    steps: [
      { title: "Home inspection", owner: "agent" },
      { title: "Appraisal", owner: "lender" },
      { title: "Attorney review", owner: "lawyer" },
      { title: "Mortgage approval", owner: "lender" },
    ],
  },
  {
    key: "closing",
    label: "Closing",
    steps: [
      { title: "Closing-day details", owner: "agent" },
      { title: "Final walkthrough", owner: "agent" },
      { title: "Keys", owner: "agent" },
      { title: "Welcome home", owner: "agent" },
    ],
  },
]

export const SELL_PHASES: { key: SellPhase; label: string; steps: StepDef[] }[] = [
  {
    key: "s_preparing",
    label: "Preparing",
    steps: [
      { title: "Staging", owner: "agent" },
      { title: "Photography", owner: "agent" },
      { title: "Pricing", owner: "agent" },
    ],
  },
  {
    key: "listing",
    label: "Listing",
    steps: [
      { title: "Client approves the photos", owner: "client" },
      { title: "Client approves the listing description", owner: "client" },
      { title: "Listing goes live", owner: "agent" },
      { title: "Shared with buyers and agents", owner: "agent" },
    ],
  },
  // Dates, times and feedback live in the open house list, not as steps.
  { key: "open_house", label: "Open house", steps: [] },
  // Each offer, its status and the agent's notes live in the offers list.
  { key: "offers", label: "Offers", steps: [] },
  {
    key: "s_contract",
    label: "Contract",
    steps: [
      { title: "Inspection", owner: "agent" },
      { title: "Appraisal", owner: "lender" },
      { title: "Attorney review", owner: "lawyer" },
    ],
  },
  {
    key: "s_closing",
    label: "Closing",
    steps: [
      { title: "Closing-day details", owner: "agent" },
      { title: "Keys", owner: "agent" },
    ],
  },
]

// Kept for older callers: the buying journey.
export const PHASES = BUY_PHASES

export function phasesFor(j: Journey) {
  return j === "sell" ? SELL_PHASES : BUY_PHASES
}

// The Open house stage reads "Private showings" when the agent has switched
// the seller to vetted buyers only.
export function stageLabel(key: Phase, privateShowings = false) {
  if (key === "open_house" && privateShowings) return "Private showings"
  return [...BUY_PHASES, ...SELL_PHASES].find((p) => p.key === key)?.label ?? ""
}

export function journeyOf(key: string | null | undefined): Journey {
  return SELL_PHASES.some((p) => p.key === key) ? "sell" : "buy"
}

// A new client with no stage yet starts at Preparing.
export function toBuyPhase(value: unknown): BuyPhase {
  return BUY_PHASES.some((p) => p.key === value) ? (value as BuyPhase) : "preparing"
}
export function toSellPhase(value: unknown): SellPhase {
  return SELL_PHASES.some((p) => p.key === value) ? (value as SellPhase) : "s_preparing"
}
export function toPhase(value: unknown): Phase {
  return SELL_PHASES.some((p) => p.key === value) ? (value as SellPhase) : toBuyPhase(value)
}

export function toOwner(value: unknown): Owner {
  return value === "client" ||
    value === "lawyer" ||
    value === "lender" ||
    value === "selling_agent"
    ? value
    : "agent"
}

export function phaseIndex(p: Phase) {
  const list: { key: Phase }[] = phasesFor(journeyOf(p))
  return list.findIndex((x) => x.key === p)
}

// Documents the buyer hands over for the offer packet. Added to the
// client's "Documents collected" list when they move into the Offer phase.
// (The offer letter itself is the agent's to write, so it isn't here.)
export const OFFER_DOCS: string[] = [
  "Last two months of bank statements",
  "Mortgage pre-approval letter",
  "Last two months of pay stubs",
  "Letter of employment",
]
