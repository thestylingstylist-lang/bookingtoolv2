import "server-only"

// Email that gives a client the link to their suite.

import { suiteLetter, sPara, sButton, sSmall, esc } from "@/lib/letter"

export function portalLinkEmail(opts: { clientFirstName: string; agentName: string; brokerage?: string; link: string; suite: string }) {
  const hello = opts.clientFirstName ? `Hello ${esc(opts.clientFirstName)}.` : "Hello."
  const helloText = opts.clientFirstName ? `Hello ${opts.clientFirstName}.` : "Hello."
  const html = suiteLetter({
    agentName: opts.agentName,
    brokerage: opts.brokerage,
    heading: `Welcome to your ${opts.suite}`,
    body:
      sPara(`${hello} I&rsquo;ve prepared your ${opts.suite}. You&rsquo;ll see where things stand and what comes next, and you can write to me anytime.`) +
      sButton(opts.link, `Open your ${opts.suite}`) +
      sSmall("No password needed. This link is yours alone, so please keep it private. Bookmark it to return anytime."),
    signoff: "Talk soon,",
    signature: opts.agentName.trim().split(/\s+/)[0],
  })
  const text = `${helloText} I've prepared your ${opts.suite}. You'll see where things stand and what comes next, and you can write to me anytime.\n\nOpen your ${opts.suite}: ${opts.link}\n\nNo password needed. This link is yours alone, so please keep it private. Bookmark it to return anytime.\n\nTalk soon,\n${opts.agentName.trim().split(/\s+/)[0]}`
  return { subject: `${opts.agentName} has prepared your ${opts.suite}`, html, text }
}
