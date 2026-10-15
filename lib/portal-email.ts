import "server-only"

// Email that gives a client their private portal link. Airy white look.

import { letterHtml, para, button, small, esc } from "@/lib/letter"

export function portalLinkEmail(opts: { clientFirstName: string; agentName: string; link: string }) {
  const hi = opts.clientFirstName ? `Hi ${esc(opts.clientFirstName)},` : "Hi,"
    const html = letterHtml({
    eyebrow: opts.agentName,
    heading: "Your home search, in one place",
    body:
      para(`${hi} I set up a private page for you. You can see where things stand, what&rsquo;s next, and message me anytime.`) +
      button(opts.link, "Open my page") +
      small("No password needed. This link is private to you, so please don&rsquo;t share it. Bookmark it to come back anytime."),
    signoff: "Talk soon,",
    signature: opts.agentName.trim().split(/\s+/)[0],
  })
  const text = `${hi}\n\n${opts.agentName} set up a private page for you. See where things stand, what's next, and message ${opts.agentName} anytime.\n\nOpen my page: ${opts.link}\n\nNo password needed. This link is private to you, so please don't share it.`
  return { subject: `${opts.agentName} set up your home search page`, html, text }
}
