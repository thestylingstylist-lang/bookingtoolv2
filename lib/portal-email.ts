import "server-only"

// Email that gives a client their private portal link. Airy white look.

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function portalLinkEmail(opts: { clientFirstName: string; agentName: string; link: string }) {
  const hi = opts.clientFirstName ? `Hi ${esc(opts.clientFirstName)},` : "Hi,"
  const agent = esc(opts.agentName)
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ee;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ecebe6;border-radius:14px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:36px 36px 8px;">
  <h1 style="margin:0;font-size:24px;font-weight:normal;color:#3d3230;font-family:Georgia,serif;">Your home search, in one place</h1>
  <p style="margin:14px 0 0;color:#3d3230;font-size:15px;line-height:1.55;">${hi} ${agent} set up a private page for you. See where things stand, what's next, and message ${agent} anytime.</p>
</td></tr>
<tr><td style="padding:22px 36px 8px;">
  <a href="${opts.link}" style="display:inline-block;background:#3d3230;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;">Open my page</a>
</td></tr>
<tr><td style="padding:14px 36px 32px;">
  <p style="margin:0;color:#8a7872;font-size:13px;line-height:1.5;">No password needed. This link is private to you, so please don't share it. Bookmark it to come back anytime.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
  const text = `${hi}\n\n${opts.agentName} set up a private page for you. See where things stand, what's next, and message ${opts.agentName} anytime.\n\nOpen my page: ${opts.link}\n\nNo password needed. This link is private to you, so please don't share it.`
  return { subject: `${opts.agentName} set up your home search page`, html, text }
}
