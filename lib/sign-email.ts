import "server-only"

// Emails for the signing flow. Kept separate from lib/email.ts so that file
// doesn't need to change. Uses the same clay look.

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const wrap = (inner: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f3ef;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f3ef;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
${inner}
</table>
</td></tr></table>
</body></html>`

// To the client: "please review and sign".
export function signRequestEmail(opts: {
  clientFirstName: string
  agentName: string
  title: string
  link: string
}) {
  const hi = opts.clientFirstName ? `Hi ${esc(opts.clientFirstName)},` : "Hi,"
  const html = wrap(`
    <tr><td style="background:#b08477;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#1c1a19;font-family:Georgia,serif;">A document to sign</h1>
      <p style="margin:14px 0 0;color:#3d3230;font-size:15px;line-height:1.5;">${hi} ${esc(opts.agentName)} sent you the <strong>${esc(opts.title)}</strong> to review and sign.</p>
    </td></tr>
    <tr><td style="padding:20px 32px 8px;">
      <a href="${opts.link}" style="display:inline-block;background:#3d3230;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;">Review and sign</a>
    </td></tr>
    <tr><td style="padding:12px 32px 28px;">
      <p style="margin:0;color:#8a7872;font-size:13px;line-height:1.5;">This link is private to you. Questions? Just reply to this email.</p>
    </td></tr>
  `)
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
  const html = wrap(`
    <tr><td style="background:#5f7266;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#1c1a19;font-family:Georgia,serif;">${esc(opts.clientName)} signed</h1>
      <p style="margin:14px 0 0;color:#3d3230;font-size:15px;line-height:1.5;">The <strong>${esc(opts.title)}</strong> was signed ${esc(opts.signedLabel)}.</p>
    </td></tr>
    <tr><td style="padding:20px 32px 28px;">
      <a href="${opts.link}" style="display:inline-block;background:#3d3230;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;">Open client</a>
    </td></tr>
  `)
  const text = `${opts.clientName} signed the ${opts.title} ${opts.signedLabel}.\n\nOpen client: ${opts.link}`
  return { subject: `${opts.clientName} signed the ${opts.title}`, html, text }
}
