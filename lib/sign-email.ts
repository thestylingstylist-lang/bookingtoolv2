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

// To the broker: the agent has signed, and the agreement waits on the broker's signature
// before it goes to the client.
export function brokerRequestEmail(opts: {
  brokerName: string
  agentName: string
  clientName: string
  title: string
  link: string
}) {
  const first = opts.brokerName.trim().split(/\s+/)[0]
  const hello = first ? `Hello ${esc(first)}.` : "Hello."
  const html = teamNote(
    "An agreement for your signature",
    para(`${hello} ${esc(opts.agentName)} has signed the <strong>${esc(opts.title)}</strong> for ${esc(opts.clientName)}. It goes to ${esc(opts.clientName)} as soon as you sign.`) +
      button(opts.link, "Review and sign"),
  )
  const text = `${first ? `Hello ${first}.` : "Hello."} ${opts.agentName} has signed the ${opts.title} for ${opts.clientName}. It goes to ${opts.clientName} as soon as you sign.\n\nReview and sign: ${opts.link}`
  return { subject: `For your signature: ${opts.title} for ${opts.clientName}`, html, text }
}

// To the client and the agent: the signed copy, attached.
export function signedCopyEmail(opts: { firstName: string; title: string; link: string; fromAgent: string; toClient: boolean }) {
  const hello = opts.firstName ? `Hello ${esc(opts.firstName)}.` : "Hello."
  const line = opts.toClient
    ? `Your <strong style="font-weight:500;">${esc(opts.title)}</strong> is signed by everyone. Your copy is attached, and you can open it any time from the link below.`
    : `The <strong>${esc(opts.title)}</strong> is signed by everyone. The signed copy is attached and filed on your client&rsquo;s page.`
  const html = opts.toClient
    ? suiteLetter({ agentName: opts.fromAgent, heading: "Your signed copy", body: sPara(`${hello} ${line}`) + sButton(opts.link, "Open your signed copy"), signoff: "Thank you,", signature: opts.fromAgent.trim().split(/\s+/)[0] })
    : teamNote("Signed by everyone", para(`${hello} ${line}`) + button(opts.link, "Open client"))
  const plain = line.replace(/<[^>]+>/g, "").replace(/&rsquo;/g, "\u2019")
  const text = `${opts.firstName ? `Hello ${opts.firstName}.` : "Hello."} ${plain}\n\n${opts.link}`
  return { subject: `Signed: ${opts.title}`, html, text }
}
