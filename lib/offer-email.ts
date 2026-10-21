import "server-only"

// The offer email a realtor sends the listing agent, in the same open-letter look.
import { letterHtml, para, details, esc } from "@/lib/letter"

export type OfferTerms = {
  street: string
  address: string
  buyer: string
  amount: string
  deposit: string
  financing: string
  contingencies: string
  closing: string
  goodUntil: string
}

const rows = (t: OfferTerms): [string, string][] => [
  ["Property", t.address],
  ["Buyer", t.buyer],
  ["Offer price", t.amount],
  ["Earnest money", t.deposit],
  ["Financing", t.financing],
  ["Contingencies", t.contingencies],
  ["Closing", t.closing],
  ["Offer good until", t.goodUntil],
]

const paras = (msg: string) =>
  msg
    .trim()
    .split(/\n{2,}/)
    .map((p) => para(esc(p).replace(/\n/g, "<br>")))
    .join("")

export function offerEmail(o: { agentName: string; message: string; terms: OfferTerms; followUp?: boolean }) {
  const first = o.agentName.trim().split(/\s+/)[0] || o.agentName
  const html = letterHtml({
    eyebrow: o.agentName,
    heading: o.followUp ? `Our offer on ${esc(o.terms.street)}` : `Offer for ${esc(o.terms.street)}`,
    body: paras(o.message) + details(rows(o.terms).filter(([, v]) => v)),
    signoff: "Thank you,",
    signature: first,
  })
  const text = `${o.message.trim()}\n\n${rows(o.terms)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n\n${first}`
  const subject = o.followUp ? `${o.terms.street}: following up on our offer` : `Offer: ${o.terms.address}`
  return { subject, html, text }
}
