// The deal workflow: the phases a client moves through, and the standard
// checklist for each. Plain module, safe to import from server and client code.

export type Phase = "showing" | "offer" | "closing"

export const PHASES: { key: Phase; label: string; steps: string[] }[] = [
  {
    key: "showing",
    label: "Showing",
    steps: [
      "Agreement signed",
      "Ask what they're looking for",
      "Buyer sent their criteria",
      "Send curated homes",
      "Get their availability",
      "Set up viewings",
    ],
  },
  {
    key: "offer",
    label: "Offer",
    steps: [
      "Collect the client's documents",
      "Put together the offer packet",
      "Send the offer to the selling agent",
      "Hear back from the selling agent",
    ],
  },
  {
    key: "closing",
    label: "Closing",
    steps: [
      "Home inspection",
      "Client connects with a lawyer",
      "Client applies for the loan",
      "Appraisal (if the lender asks)",
      "Buyer gets funds to the lawyer",
      "Closed",
    ],
  },
]

export function toPhase(value: unknown): Phase {
  return value === "offer" || value === "closing" ? value : "showing"
}

export function phaseIndex(p: Phase) {
  return PHASES.findIndex((x) => x.key === p)
}
