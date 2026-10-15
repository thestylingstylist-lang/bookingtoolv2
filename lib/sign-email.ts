import "server-only"

// Emails for the signing flow, in the same open-letter look as every email.

import { letterHtml, teamNote, para, button, small, esc } from "@/lib/letter"

// To the client: "please review and sign".
export function signRequestEmail(opts: {
  clientFirstName: string
  agentName: string
  title: string
  link: string
}) {
  const hi = opts.clientFirstName ? `Hi ${esc(opts.clientFirstName)},` : "Hi,"
  const html = letterHtml({
    eyebrow: opts.agentName,
    heading: "A document for you to sign",
    body:
      para(`${hi} I&rsquo;ve sent you the <strong>${esc(opts.title)}</strong>. Give it a read, and you can sign right from your phone.`) +
      button(opts.link, "Review and sign") +
      small("This link is private to you. Questions? Just reply to this email."),
    signoff: "Thank you,",
    signature: opts.agentName.trim().split(/\s+/)[0],
  })
  const text = `${hi}\n\n${opts.agentName} sent you the ${opts.title} to review and sign.\n\nReview and sign: ${opts.link}\n\nThis link is private to you. Questions? Just reply to this email.`
  return { subject: `Please sign: ${opts.title}`, html, text }
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
