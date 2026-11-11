// Shared between the PDF template editor and the offer form: what a blank on a
// PDF is, and which ones Marvberry fills on its own.

export type PdfField = {
  id: string
  key: string // an AUTO key below, or "custom:<label>"
  label: string
  page: number // 0-based
  x: number // fractions of the page, from the top left
  y: number
  w: number
  h: number
  size: number // font size in points
  cover: boolean // white out what's printed underneath first, e.g. "(client's name)"
}

export const PDF_AUTO: { key: string; label: string }[] = [
  { key: "date", label: "Today’s date" },
  { key: "client_name", label: "Client name" },
  { key: "client_address", label: "Client address" },
  { key: "client_email", label: "Client email" },
  { key: "client_phone", label: "Client phone" },
  { key: "agent_name", label: "Your name" },
  { key: "brokerage", label: "Your brokerage" },
  { key: "property_address", label: "Property address" },
  { key: "offer_amount", label: "Offer amount" },
  { key: "deposit", label: "Deposit" },
  { key: "financing", label: "Financing" },
  { key: "contingencies", label: "Contingencies" },
  { key: "closing_date", label: "Closing date" },
  { key: "good_until", label: "Offer good until" },
  { key: "listing_agent", label: "Listing agent’s name" },
]

export const isCustom = (key: string) => key.startsWith("custom:")
export const labelFor = (key: string) => (isCustom(key) ? key.slice(7) : PDF_AUTO.find((a) => a.key === key)?.label ?? key)

// Custom blanks the agent fills in when sending, once each.
export function customBlanks(fields: PdfField[]): string[] {
  return [...new Set(fields.filter((f) => isCustom(f.key)).map((f) => f.key))]
}

// Guess a field from the wording printed on the form, like "(client's name)".
export function guessKey(text: string): string {
  const t = text.toLowerCase().replace(/[()’'.:]/g, " ").replace(/\s+/g, " ").trim()
  if (/seller.?s? agent|listing agent/.test(t)) return "listing_agent"
  if (/client.?s? name|buyer.?s? name/.test(t)) return "client_name"
  if (/offer amount|offer price|purchase price/.test(t)) return "offer_amount"
  if (t === "agent" || /agent name|^agent$/.test(t)) return "agent_name"
  if (/^address$|property address|property/.test(t)) return "property_address"
  if (/^date$/.test(t)) return "date"
  if (/current address/.test(t)) return "client_address"
  if (/deposit/.test(t)) return "deposit"
  if (/closing/.test(t)) return "closing_date"
  return `custom:${text.replace(/[()]/g, "").trim().replace(/^./, (c) => c.toUpperCase()).slice(0, 60)}`
}
