// The deal workflow: the phases a client moves through, and the standard
// checklist for each. Plain module, safe to import from server and client code.

export type Phase = "showing" | "offer" | "closing"

// Who is responsible for a step. The client only ever ticks nothing themselves;
// the realtor marks everything. But the tag tells the client who they're waiting
// on, which is the whole point of the portal.
export type Owner = "agent" | "client" | "lawyer" | "lender" | "selling_agent"

export const OWNER_LABEL: Record<Owner, string> = {
  agent: "You",
  client: "Client",
  lawyer: "Lawyer",
  lender: "Lender",
  selling_agent: "Selling agent",
}

// What the CLIENT sees for each owner, from their point of view.
export const OWNER_LABEL_CLIENT: Record<Owner, string> = {
  agent: "Your agent",
  client: "Your turn",
  lawyer: "Your lawyer",
  lender: "Lender",
  selling_agent: "Selling agent",
}

export type StepDef = { title: string; owner: Owner }

export const PHASES: { key: Phase; label: string; steps: StepDef[] }[] = [
  {
    key: "showing",
    label: "Showing",
    steps: [
      { title: "Agreement signed", owner: "client" },
      { title: "Ask what they're looking for", owner: "agent" },
      { title: "Buyer sent their criteria", owner: "client" },
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
      { title: "Send the offer to the selling agent", owner: "agent" },
      { title: "Hear back from the selling agent", owner: "selling_agent" },
    ],
  },
  {
    key: "closing",
    label: "Closing",
    steps: [
      { title: "Home inspection", owner: "agent" },
      { title: "Client connects with a lawyer", owner: "client" },
      { title: "Client applies for the loan", owner: "lender" },
      { title: "Appraisal (if the lender asks)", owner: "lender" },
      { title: "Buyer gets funds to the lawyer", owner: "lawyer" },
      { title: "Closed", owner: "lawyer" },
    ],
  },
]

export function toPhase(value: unknown): Phase {
  return value === "offer" || value === "closing" ? value : "showing"
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
  return PHASES.findIndex((x) => x.key === p)
}
