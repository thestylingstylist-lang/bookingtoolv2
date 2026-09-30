import "server-only"

// The one-tap reminder, sent in the realtor's name. It reads like she wrote
// it herself, because she approved every word.

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function nudgeEmail(opts: { agentName: string; body: string; link: string }) {
  const paras = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;color:#16151a;font-size:15px;line-height:1.55;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("")
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f0ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0ee;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e3e0;border-radius:14px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:32px 36px 4px;">${paras}</td></tr>
<tr><td style="padding:4px 36px 32px;">
  <a href="${opts.link}" style="display:inline-block;background:#16151a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;">Open my page</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`
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
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e4e3e0;font-size:14px;color:#16151a;">${esc(i.client)} · ${esc(i.step)}<br><span style="color:#5d5b62;font-size:13px;">${esc(i.when)}</span></td></tr>`
    )
    .join("")
  const readyLine =
    opts.ready > 0
      ? `<p style="margin:18px 0 0;color:#16151a;font-size:15px;line-height:1.55;">${opts.ready} client reminder${opts.ready === 1 ? " is" : "s are"} ready. One tap and ${opts.ready === 1 ? "it goes" : "they go"} out in your name.</p>`
      : ""
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f0ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0ee;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e3e0;border-radius:14px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:32px 36px 4px;">
  <h1 style="margin:0;font-size:22px;color:#16151a;font-weight:600;letter-spacing:-0.01em;">${hi}</h1>
  ${opts.items.length ? `<p style="margin:10px 0 6px;color:#5d5b62;font-size:14px;">Here's what's due.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>` : ""}
  ${readyLine}
</td></tr>
<tr><td style="padding:22px 36px 32px;">
  <a href="${opts.link}" style="display:inline-block;background:#16151a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;">Open Marvberry</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`
  const text = [
    hi,
    opts.items.length ? "Here's what's due." : "",
    ...opts.items.map((i) => `${i.client} · ${i.step} · ${i.when}`),
    opts.ready > 0 ? `${opts.ready} client reminder(s) ready. One tap and they go out in your name.` : "",
    `Open Marvberry: ${opts.link}`,
  ]
    .filter(Boolean)
    .join("\n")
  return { subject: opts.items.length ? "Here's what's due" : "Client reminders are ready", html, text }
}
