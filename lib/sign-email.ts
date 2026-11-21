import "server-only"

// Emails for the signing flow, in the same open-letter look as every email.

import { teamNote, para, button, esc, suiteLetter, sPara, sButton, sSmall } from "@/lib/letter"

// To the client: "please review and sign".
export function signRequestEmail(opts: {
  clientFirstName: string
  agentName: string
  brokerage?: string
  title: string
  link: string
}) {
  const hello = opts.clientFirstName ? `Hello ${esc(opts.clientFirstName)}.` : "Hello."
  const html = suiteLetter({
    agentName: opts.agentName,
    brokerage: opts.brokerage,
    heading: "A document for your signature",
    body:
      sPara(`${hello} I&rsquo;ve sent you the <strong style="font-weight:500;">${esc(opts.title)}</strong>. Take your time reading it, and you can sign right from your phone.`) +
      sButton(opts.link, "Review and sign") +
      sSmall("This link is private to you. If you have questions, simply reply to this email."),
    signoff: "Thank you,",
    signature: opts.agentName.trim().split(/\s+/)[0],
  })
  const helloText = opts.clientFirstName ? `Hello ${opts.clientFirstName}.` : "Hello."
  const text = `${helloText} I've sent you the ${opts.title}. Take your time reading it, and you can sign right from your phone.\n\nReview and sign: ${opts.link}\n\nThis link is private to you. If you have questions, simply reply to this email.`
  return { subject: `For your signature: ${opts.title}`, html, text }
}

// To the realtor: "your client signed".
export function signedNoticeEmail(opts: {
  clientName: string
  title: string
  signedLabel: string
  link: string
}) {
  const html = teamNote(
    `${esc(opts.clientName)} signed.`,
    para(`The <strong>${esc(opts.title)}</strong> was signed ${esc(opts.signedLabel)}. It&rsquo;s filed on their page.`) +
      button(opts.link, "Open client"),
  )
  const text = `${opts.clientName} signed the ${opts.title} ${opts.signedLabel}.\n\nOpen client: ${opts.link}`
  return { subject: `${opts.clientName} signed the ${opts.title}`, html, text }
}
