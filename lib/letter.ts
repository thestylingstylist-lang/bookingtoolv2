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
<body style="margin:0;padding:0;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
<tr><td style="padding:0 8px;font-family:${FONT};font-size:11px;letter-spacing:.3em;color:#b89250;text-transform:uppercase;">${esc(o.eyebrow)}</td></tr>
${o.heading ? `<tr><td style="padding:22px 8px 0;"><h1 style="margin:0;font-family:${SERIF};font-weight:500;font-size:30px;line-height:1.22;color:#2b2520;">${o.heading}</h1></td></tr>` : ""}
<tr><td style="padding:${o.heading ? "8px" : "10px"} 8px 0;">${o.body}</td></tr>
${
  o.signoff || o.signature
    ? `<tr><td style="padding:32px 8px 0;">
${o.signoff ? `<p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.65;color:#4a433b;">${o.signoff}</p>` : ""}
${o.signature ? `<p style="margin:6px 0 0;font-family:'Caveat',cursive;font-size:36px;line-height:1;color:#2b2520;">${esc(o.signature)}</p>` : ""}
${o.role ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:13px;color:#8a8072;font-style:italic;">${o.role}</p>` : ""}
${o.contact ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:13px;color:#8a8072;">${o.contact}</p>` : ""}
</td></tr>`
    : ""
}
${o.footer ? `<tr><td style="padding:34px 8px 0;"><div style="border-top:1px solid #ece6da;padding-top:16px;font-family:${SERIF};font-style:italic;font-size:13px;color:#a2977f;">${o.footer}</div></td></tr>` : ""}
</table></td></tr></table>
</body></html>`
}

// A note from Marvberry to a realtor.
export const teamNote = (heading: string, body: string) =>
  letterHtml({ eyebrow: "Marvberry", heading, body, footer: "Marvberry. Move forward." })
