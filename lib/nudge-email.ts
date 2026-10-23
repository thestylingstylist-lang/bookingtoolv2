import "server-only"

// The one-tap reminder, sent in the realtor's name. It reads like she wrote
// it herself, because she approved every word.

import { letterHtml, button, esc } from "@/lib/letter"

export function nudgeEmail(opts: { agentName: string; body: string; link: string }) {
  // Her own words, exactly as she approved them (they already end with her name).
  const paras = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:14px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("")
  const html = letterHtml({ eyebrow: opts.agentName, body: paras + button(opts.link, "Open my page") })
  const text = `${opts.body}\n\nOpen my page: ${opts.link}`
  return { subject: `A quick reminder from ${opts.agentName}`, html, text }
}

// The realtor's own morning note. Only ever goes to her.
export function agentDayEmail(opts: {
  firstName: string
  items: { client: string; step: string; when: string }[]
  ready: number
  link: string
}) {
  const hi = opts.firstName ? `Good morning, ${esc(opts.firstName)}.` : "Good morning."

  const pastDue = opts.items.filter((i) => /past due/i.test(i.when))
  const today = opts.items.filter((i) => /today/i.test(i.when) && !/past due/i.test(i.when))
  const due = opts.items.filter((i) => /tomorrow/i.test(i.when))
  const upcoming = opts.items.filter((i) => !/past due|today|tomorrow/i.test(i.when))

  const line = (i: { client: string; step: string; when: string }) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #ece6da;">
      <span style="font-family:Georgia,serif;font-size:15px;color:#2b2520;">${esc(i.step)}</span>
      <span style="font-family:Georgia,serif;font-size:14px;color:#8a8072;"> &mdash; ${esc(i.client)}</span>${/today|tomorrow/i.test(i.when) ? "" : `<br><span style="font-family:Georgia,serif;font-size:13px;color:#a2977f;font-style:italic;">${esc(i.when.replace(/^Past due · /, "Due ").replace(/ · .*/, ""))}</span>`}
    </td></tr>`

  const group = (label: string, rows: typeof opts.items) =>
    rows.length
      ? `<p style="margin:26px 0 8px;font-family:Georgia,serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b89250;">${label}</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(line).join("")}</table>`
      : ""

  const agenda = opts.items.length
    ? `${group("Past due", pastDue)}
       ${group("Due today", today)}
       ${group("Due tomorrow", due)}
       ${group("Upcoming", upcoming)}`
    : `<p style="margin:16px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#4a433b;">Nothing's due right now &mdash; you're all caught up.</p>`

  const readyLine =
    opts.ready > 0
      ? `<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#4a433b;">${opts.ready} client reminder${opts.ready === 1 ? " is" : "s are"} ready. One tap and ${opts.ready === 1 ? "it goes" : "they go"} out in your name.</p>`
      : ""

  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#f2f0ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ee;">
<tr><td align="center" style="padding:44px 20px;">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding:0 8px;">
  <p style="margin:0 0 22px;"><img src="https://www.marvberry.com/marvberry-wordmark.png" width="125" height="24" alt="Marvberry" style="display:block;height:24px;width:auto;border:0;"></p>
  <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#4a433b;">${hi}</p>
  <p style="margin:14px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#4a433b;">Welcome to a brand new day. I\u2019ve taken a look at your agenda, and here\u2019s what you have.</p>
  ${agenda}
  ${readyLine}
  <p style="margin:30px 0 0;">
    <a href="${opts.link}" style="font-family:Georgia,serif;font-size:14px;letter-spacing:.04em;color:#2b2520;text-decoration:none;border-bottom:1px solid #b89250;padding-bottom:3px;">Open Marvberry</a>
  </p>
  <p style="margin:34px 0 0;border-top:1px solid #e6ddce;padding-top:16px;font-family:Georgia,serif;font-size:12px;letter-spacing:.04em;color:#a2977f;font-style:italic;">Marvberry. The Real Estate Agent&rsquo;s Client Experience Assistant.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`

  const textLines = ["MARVBERRY", "", hi, "Welcome to a brand new day. I\u2019ve taken a look at your agenda, and here\u2019s what you have.", ""]
  if (opts.items.length) {
    if (pastDue.length) {
      textLines.push("", "PAST DUE")
      pastDue.forEach((i) => textLines.push(`- ${i.step} — ${i.client}`))
    }
    if (today.length) {
      textLines.push("", "DUE TODAY")
      today.forEach((i) => textLines.push(`- ${i.step} — ${i.client}`))
    }
    if (due.length) {
      textLines.push("", "DUE TOMORROW")
      due.forEach((i) => textLines.push(`- ${i.step} — ${i.client}`))
    }
    if (upcoming.length) {
      textLines.push("", "UPCOMING")
      upcoming.forEach((i) => textLines.push(`- ${i.step} — ${i.client}`))
    }
  } else {
    textLines.push("Nothing's due right now — you're all caught up.")
  }
  if (opts.ready > 0) {
    textLines.push("", `${opts.ready} client reminder(s) ready. One tap and they go out in your name.`)
  }
  textLines.push("", `Open Marvberry: ${opts.link}`, "", "Marvberry. The Real Estate Agent's Client Experience Assistant.")
  const text = textLines.join("\n")

  return { subject: opts.items.length ? "Here's what's on your agenda today" : "You're all caught up", html, text }
}
