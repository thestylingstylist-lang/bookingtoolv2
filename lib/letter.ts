// One look for every email Marvberry sends: an open letter on white, no boxes.
// Clients get letters headed with their realtor's name and signed by the realtor.
// Realtors get notes headed "Marvberry", signed off with the brand line.

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const FONT = "Georgia,serif"
const SERIF = "'Playfair Display',Georgia,serif"

export const para = (html: string) =>
  `<p style="margin:14px 0 0;font-family:${FONT};font-size:16px;line-height:1.65;color:#4a433b;">${html}</p>`

export const small = (html: string) =>
  `<p style="margin:14px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:#8a8072;">${html}</p>`

export const button = (href: string, label: string) =>
  `<p style="margin:26px 0 0;"><a href="${href}" style="display:inline-block;background:#2a221c;color:#f6efe5;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:15px;">${label}</a></p>`

export const textLink = (href: string, label: string) =>
  `<a href="${href}" style="color:#2b2520;text-decoration:none;border-bottom:1px solid #b89250;">${label}</a>`

// Label / value lines, no table box: a gold label over a calm value.
export function details(rows: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:0 0 12px;"><div style="font-family:${FONT};font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b89250;">${esc(k)}</div><div style="margin-top:2px;font-family:${SERIF};font-size:18px;color:#2b2520;">${esc(v)}</div></td></tr>`,
    )
    .join("")}</table>`
}

export function letterHtml(o: {
  eyebrow: string
  wordmark?: boolean
  heading?: string
  body: string
  signoff?: string
  signature?: string
  role?: string
  contact?: string
  footer?: string
}) {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..600;1,400..600&family=Caveat&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f2f0ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ee;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
<tr><td style="padding:0 8px;${o.wordmark ? "" : `font-family:${FONT};font-size:11px;letter-spacing:.3em;color:#b89250;text-transform:uppercase;`}">${o.wordmark ? `<img src="https://www.marvberry.com/marvberry-wordmark.png" width="125" height="24" alt="Marvberry" style="display:block;height:24px;width:auto;border:0;">` : esc(o.eyebrow)}</td></tr>
${o.heading ? `<tr><td style="padding:22px 8px 0;"><h1 style="margin:0;font-family:${SERIF};font-weight:500;font-size:30px;line-height:1.22;color:#2b2520;">${o.heading}</h1></td></tr>` : ""}
<tr><td style="padding:${o.heading ? "8px" : "10px"} 8px 0;">${o.body}</td></tr>
${
  o.signoff || o.signature
    ? `<tr><td style="padding:32px 8px 0;">
${o.signoff ? `<p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.65;color:#4a433b;">${o.signoff}</p>` : ""}
${o.signature ? `<!--sig--><p style="margin:6px 0 0;font-family:'Caveat',cursive;font-size:36px;line-height:1;color:#2b2520;">${esc(o.signature)}</p><!--/sig-->` : ""}
${o.role ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:13px;color:#8a8072;font-style:italic;">${o.role}</p>` : ""}
${o.contact ? `<!--contact--><p style="margin:10px 0 0;font-family:${FONT};font-size:13px;color:#8a8072;">${o.contact}</p><!--/contact-->` : ""}
</td></tr>`
    : ""
}
<!--card-->
${o.footer ? `<tr><td style="padding:34px 8px 0;"><div style="border-top:1px solid #ece6da;padding-top:16px;font-family:${SERIF};font-style:italic;font-size:13px;color:#a2977f;">${o.footer}</div></td></tr>` : ""}
</table></td></tr></table>
</body></html>`
}

// A note from Marvberry to a realtor.
export const teamNote = (heading: string, body: string) =>
  letterHtml({ eyebrow: "Marvberry", wordmark: true, heading, body, footer: "Marvberry. The Real Estate Agent&rsquo;s Client Experience Assistant." })

// The realtor's email signature, added under every letter they send a client.
export type AgentCard = {
  name: string
  business?: string
  license?: string
  phone?: string
  email?: string
  photo?: string
  site?: string
}

export function cardHtml(c: AgentCard) {
  const pic = c.photo
  const line = (t: string, size = 14, color = "#6b6158") =>
    `<div style="margin-top:3px;font-family:${FONT};font-size:${size}px;line-height:1.5;color:${color};">${t}</div>`
  const reach = [
    c.phone ? `<a href="tel:${esc(c.phone.replace(/[^+\d]/g, ""))}" style="color:#6b6158;text-decoration:none;">${esc(c.phone)}</a>` : "",
    c.email ? `<a href="mailto:${esc(c.email)}" style="color:#6b6158;text-decoration:none;">${esc(c.email)}</a>` : "",
  ].filter(Boolean)
  return `<tr><td style="padding:0 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr>
${pic ? `<td width="76" valign="top" style="padding:14px 16px 0 0;"><img src="${esc(pic)}" width="72" height="72" alt="${esc(c.name)}" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;"></td>` : ""}
<td valign="top" style="padding-top:14px;">
<div style="font-family:${SERIF};font-size:19px;color:#2b2520;">${esc(c.name)}</div>
${c.business && c.business !== c.name ? line(esc(c.business), 14, "#2b2520") : ""}
${line(["Real Estate Agent", c.license ? `License #${esc(c.license)}` : ""].filter(Boolean).join(" &nbsp;&middot;&nbsp; "), 12, "#9a8f84")}
${reach.length ? line(reach.join(" &nbsp;&middot;&nbsp; "), 13) : ""}
${c.site ? `<div style="margin-top:6px;"><a href="${esc(c.site)}" style="font-family:${FONT};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b89250;text-decoration:none;">Book a time with me</a></div>` : ""}
</td></tr></table>
</td></tr>`
}

export function cardText(c: AgentCard) {
  return ["", "--", c.name, c.business && c.business !== c.name ? c.business : "", ["Real Estate Agent", c.license ? `License #${c.license}` : ""].filter(Boolean).join(" · "), [c.phone, c.email].filter(Boolean).join(" · "), c.site ? `Book a time: ${c.site}` : ""]
    .filter((l, i) => i < 2 || l)
    .join("\n")
}

// The plain-text letter's own phone/email line, which the signature now covers.
function dropContact(text: string, c: AgentCard) {
  const line = [c.phone, c.email].filter(Boolean).join(" · ")
  return line && text.trimEnd().endsWith(line) ? text.trimEnd().slice(0, -line.length).trimEnd() : text
}

// Puts the signature into a finished letter (and drops the plain contact line it replaces).
export function withCard(html: string, text: string, c: AgentCard | null | undefined) {
  if (!c || !html.includes("<!--card-->")) return { html, text }
  return {
    html: html.replace(/<!--contact-->[\s\S]*?<!--\/contact-->/, "").replace(/<!--sig-->[\s\S]*?<!--\/sig-->/, "").replace("<!--card-->", cardHtml(c)),
    text: dropContact(text, c) + "\n" + cardText(c),
  }
}

// ---- The suite letter -------------------------------------------------------
// Client emails in the luxury look: the agent's monogram, name and brokerage,
// a fine gold line, a thin serif heading and a small sans body. No Marvberry
// branding. Agents' own notes keep the letter above.

const LX = {
  bg: "#F8F8F8",
  ink: "#1F1E1C",
  body: "#3E3B37",
  soft: "#67635C",
  gold: "#C2A46B",
  line: "#DCCBA6",
  hair: "#E6E4E1",
  blue: "#D6E6EC",
  serif: "'Cormorant Garamond',Georgia,'Times New Roman',serif",
  sans: "Inter,'Helvetica Neue',Arial,sans-serif",
}

export const sPara = (html: string) =>
  `<p style="margin:16px 0 0;font-family:${LX.sans};font-size:15px;line-height:1.7;color:${LX.body};">${html}</p>`

export const sSmall = (html: string) =>
  `<p style="margin:18px 0 0;font-family:${LX.sans};font-size:12.5px;line-height:1.6;color:${LX.soft};">${html}</p>`

export const sButton = (href: string, label: string) =>
  `<p style="margin:28px 0 0;"><a href="${href}" style="display:inline-block;background:${LX.ink};color:${LX.bg};text-decoration:none;padding:14px 24px;border-radius:2px;font-family:${LX.sans};font-size:13px;letter-spacing:.3px;">${label}</a></p>`

export const sLink = (href: string, label: string) =>
  `<a href="${href}" style="color:${LX.ink};text-decoration:none;border-bottom:1px solid ${LX.gold};">${label}</a>`

// "If something comes up, that's no trouble. Choose a new time or cancel"
export const sLinkLine = (lead: string, href: string, label: string) =>
  `<p style="margin:22px 0 0;font-family:${LX.sans};font-size:14px;line-height:1.6;color:${LX.soft};">${lead ? `${lead} ` : ""}${sLink(href, label)}</p>`

export const sWhen = (label: string, sub: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1px solid ${LX.hair};border-bottom:1px solid ${LX.hair};">
<tr><td style="padding:18px 0 0;font-family:${LX.sans};font-size:11.5px;letter-spacing:.4px;color:${LX.soft};"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${LX.blue};margin-right:8px;vertical-align:middle;"></span>When</td></tr>
<tr><td style="padding:8px 0 0;font-family:${LX.serif};font-size:23px;color:${LX.ink};">${label}</td></tr>
<tr><td style="padding:4px 0 18px;font-family:${LX.sans};font-size:13px;color:${LX.soft};">${sub}</td></tr>
</table>`

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase() || "·"
  )
}

export function suiteLetter(o: {
  agentName: string
  brokerage?: string
  heading?: string
  body: string
  signoff?: string
  signature?: string
  contact?: string
}) {
  const brokerage = o.brokerage && o.brokerage !== o.agentName ? o.brokerage : ""
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Inter:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${LX.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${LX.bg};padding:44px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 8px 18px;border-bottom:1px solid ${LX.line};">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="38" height="38" align="center" valign="middle" style="width:38px;height:38px;border:1px solid ${LX.gold};border-radius:50%;font-family:${LX.serif};font-size:13px;letter-spacing:1px;color:${LX.ink};">${esc(initialsOf(o.agentName))}</td>
<td style="padding-left:12px;"><div style="font-family:${LX.serif};font-size:18px;font-weight:500;color:${LX.ink};">${esc(o.agentName)}</div>${brokerage ? `<div style="margin-top:1px;font-family:${LX.sans};font-size:12px;color:${LX.soft};">${esc(brokerage)}</div>` : ""}</td>
</tr></table>
</td></tr>
${o.heading ? `<tr><td style="padding:30px 8px 0;"><h1 style="margin:0;font-family:${LX.serif};font-weight:300;font-size:34px;line-height:1.15;color:${LX.ink};">${o.heading}</h1></td></tr>` : ""}
<tr><td style="padding:${o.heading ? "4px" : "14px"} 8px 0;">${o.body}</td></tr>
${
  o.signoff || o.signature
    ? `<tr><td style="padding:34px 8px 0;">
${o.signoff ? `<p style="margin:0;font-family:${LX.sans};font-size:15px;line-height:1.6;color:${LX.body};">${o.signoff}</p>` : ""}
${o.signature ? `<!--sig--><p style="margin:4px 0 0;font-family:${LX.serif};font-style:italic;font-weight:300;font-size:32px;line-height:1.1;color:${LX.ink};">${esc(o.signature)}</p><!--/sig-->` : ""}
${o.contact ? `<!--contact--><p style="margin:8px 0 0;font-family:${LX.sans};font-size:12.5px;color:${LX.soft};">${o.contact}</p><!--/contact-->` : ""}
</td></tr>`
    : ""
}
<!--card-->
</table></td></tr></table>
</body></html>`
}
