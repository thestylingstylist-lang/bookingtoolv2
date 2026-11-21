// Standard steps, reworded from the client's point of view. Steps the realtor
// adds themselves show as written.
export function clientWording(title: string, agentFirst: string) {
  const map: Record<string, string> = {
    Consultation: `Consultation with ${agentFirst}`,
    "Pre-approval or proof of funds": "Send your pre-approval or proof of funds",
    "Client approves the photos": "Approve your photos",
    "Client approves the listing description": "Approve your listing description",
    "Listing goes live": "Your listing goes live",
    "Shared with buyers and agents": "Your home is shared with buyers and agents",
    "Ask what they're looking for": `${agentFirst} asks what you're looking for`,
    "Buyer sent their criteria": "Send your wish list",
    "Send curated homes": `${agentFirst} sends homes to look at`,
    "Get their availability": "Share when you're free to see homes",
    "Set up viewings": "Viewings booked",
    "Collect the client's documents": "Send your documents",
    "Put together the offer packet": `${agentFirst} puts your offer together`,
    "Send the offer to the selling agent": "Offer sent to the seller's agent",
    "Hear back from the selling agent": "Awaiting the seller's answer",
    "Client connects with a lawyer": "Connect with your lawyer",
    "Client applies for the loan": "Loan with your lender",
  }
  return map[title] ?? title
}

