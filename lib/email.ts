import "server-only"

// Sends transactional email via the Resend HTTP API. No SDK needed — we call
// the REST endpoint directly with the API key already set in the environment.
// If the key is missing or Resend errors, we log and return false so the
// caller can decide what to do; a failed email must never break a booking.

const RESEND_ENDPOINT = "https://api.resend.com/emails"

// The verified sending domain is marvberry.com. Update the display name here
// if you want the client to see something other than the agent's name.
function fromLine(agentName: string) {
  const name = (agentName || "Marvberry").replace(/[\r\n"]/g, "").trim()
  return `${name} <bookings@marvberry.com>`
}

type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  fromName?: string
}

export async function sendEmail(args: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error("[email] RESEND_API_KEY is not set — skipping send")
    return false
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromLine(args.fromName ?? ""),
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[email] Resend responded ${res.status}: ${body}`)
      return false
    }
    return true
  } catch (err) {
    console.error("[email] send failed:", err)
    return false
  }
}

// ---- Templates -------------------------------------------------------------

// Private link a client uses to reschedule or cancel their own booking.
export function manageUrl(token: string) {
  return `https://marvberry.com/manage/${token}`
}

const manageBlock = (url: string) =>
  `<tr><td style="padding:4px 32px 8px;"><p style="margin:0;color:#5d5b62;font-size:13px;">Need a different time? <a href="${url}" style="color:#16151a;">Reschedule or cancel</a></p></td></tr>`

const wrap = (inner: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f0ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0ee;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
${inner}
</table>
</td></tr></table>
</body></html>`

function detailRows(rows: [string, string][]) {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 0;color:#5d5b62;font-size:13px;width:120px;">${k}</td><td style="padding:4px 0;color:#16151a;font-size:14px;font-weight:600;">${v}</td></tr>`
    )
    .join("")
}

export function clientConfirmationEmail(opts: {
  clientFirstName: string
  agentName: string
  whenLabel: string
  meetingType: string
  agentPhone?: string
  agentEmail?: string
  manageUrl?: string
}) {
  const how =
    opts.meetingType === "phone"
      ? `${opts.agentName} will call you at the number you gave.`
      : `${opts.agentName} will send a video link before your call.`
  const contact = [opts.agentPhone, opts.agentEmail].filter(Boolean).join(" &middot; ")

  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">You're booked${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.</h1>
      <p style="margin:12px 0 0;color:#16151a;font-size:15px;line-height:1.5;">Your consultation with ${opts.agentName} is confirmed. Here are the details:</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f0ee;border-radius:10px;padding:16px;">
        ${detailRows([
          ["When", opts.whenLabel],
          ["Type", opts.meetingType === "phone" ? "Phone call" : "Video call"],
        ])}
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0;color:#16151a;font-size:14px;line-height:1.5;">${how}</p>
    </td></tr>
    ${opts.manageUrl ? manageBlock(opts.manageUrl) : ""}
    ${
      contact
        ? `<tr><td style="padding:8px 32px 28px;"><p style="margin:0;color:#5d5b62;font-size:13px;">Questions? ${contact}</p></td></tr>`
        : `<tr><td style="height:20px;"></td></tr>`
    }
  `)

  const text = `You're booked${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.

Your consultation with ${opts.agentName} is confirmed.

When: ${opts.whenLabel}
Type: ${opts.meetingType === "phone" ? "Phone call" : "Video call"}

${how}${opts.manageUrl ? `\n\nNeed a different time? Reschedule or cancel: ${opts.manageUrl}` : ""}${contact ? `\n\nQuestions? ${[opts.agentPhone, opts.agentEmail].filter(Boolean).join(" · ")}` : ""}`

  return { subject: `You're booked with ${opts.agentName}`, html, text }
}

export function chatConfirmationEmail(opts: {
  clientFirstName: string
  whenLabel: string
  meetingType: string
  zoom?: { url: string; meetingId: string; passcode: string }
}) {
  const over = opts.meetingType === "phone" ? "by phone" : "over video"
  const callType = opts.meetingType === "phone" ? "phone call" : "video call"
  const howLine =
    opts.meetingType === "phone"
      ? "Since we're talking by phone, I'll give you a call at the number you provided."
      : "We\u2019ll meet on Zoom. Here\u2019s your link to join:"

  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..600;1,400..600&family=Caveat&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#faf7f1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f1;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
<tr><td style="padding:0 8px;font-family:Georgia,serif;font-size:11px;letter-spacing:.3em;color:#b89250;">MARVBERRY</td></tr>
<tr><td style="padding:22px 8px 0;">
<h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:30px;line-height:1.22;color:#2b2520;">Your deals are about to get so much simpler.</h1>
</td></tr>
<tr><td style="padding:22px 8px 0;">
<p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">Hi ${opts.clientFirstName},</p>
<p style="margin:14px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">I&rsquo;m happy you reached out and booked your setup session. Just so you know, your date is confirmed and we&rsquo;ll be talking ${over}.</p>
<p style="margin:14px 0 0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">To get us prepared and get the most out of our meeting, please come ready to talk through a few things:</p>
</td></tr>
<tr><td style="padding:16px 8px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#4a433b;padding:5px 0;">&middot;&nbsp;&nbsp;Your schedule</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#4a433b;padding:5px 0;">&middot;&nbsp;&nbsp;Your business operations</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#4a433b;padding:5px 0;">&middot;&nbsp;&nbsp;The goals you&rsquo;d like to achieve</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#4a433b;padding:5px 0;">&middot;&nbsp;&nbsp;The customer experience you&rsquo;d like to be known for</td></tr>
</table>
</td></tr>
<tr><td style="padding:16px 8px 0;">
<p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">Also, bring your brand colors. If you don&rsquo;t have brand colors yet, that&rsquo;s okay &mdash; I come from a background in branding, so I can help you with that too.</p>
</td></tr>
<tr><td style="padding:26px 8px 0;">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="font-family:Georgia,serif;font-size:11px;letter-spacing:.18em;color:#b89250;padding:0 0 3px;">WHEN</td></tr>
<tr><td style="font-family:'Playfair Display',Georgia,serif;font-size:19px;color:#2b2520;padding:0 0 2px;">${opts.whenLabel}</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:14px;color:#6d655b;padding:2px 0 0;">A 30-minute ${callType} with Alecia</td></tr>
</table>
</td></tr>
<tr><td style="padding:16px 8px 0;">
<p style="margin:0;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#6d655b;">${howLine}</p>
${opts.meetingType !== "phone" && opts.zoom ? `<p style="margin:12px 0 0;"><a href="${opts.zoom.url}" style="font-family:Georgia,serif;font-size:14px;letter-spacing:.06em;color:#2b2520;text-decoration:none;border-bottom:1px solid #b89250;padding-bottom:3px;">Join the Zoom call</a></p>
<p style="margin:10px 0 0;font-family:Georgia,serif;font-size:13px;line-height:1.6;color:#8a8072;">Meeting ID ${opts.zoom.meetingId} &nbsp;&middot;&nbsp; Passcode ${opts.zoom.passcode}</p>` : ""}
</td></tr>
<tr><td style="padding:34px 8px 0;">
<p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.65;color:#4a433b;">Can&rsquo;t wait to talk,</p>
<p style="margin:6px 0 0;font-family:'Caveat',cursive;font-size:36px;line-height:1;color:#2b2520;">Alecia</p>
<p style="margin:4px 0 0;font-family:Georgia,serif;font-size:13px;color:#8a8072;font-style:italic;">Founder, Marvberry</p>
</td></tr>
<tr><td style="padding:34px 8px 0;">
<div style="border-top:1px solid #e6ddce;padding-top:16px;">
<p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:13px;color:#a2977f;">Marvberry. Move forward.</p>
</div>
</td></tr>
</table></td></tr></table>
</body></html>`

  const text = `Your deals are about to get so much simpler.

Hi ${opts.clientFirstName},

I'm happy you reached out and booked your setup session. Just so you know, your date is confirmed and we'll be talking ${over}.

To get us prepared and get the most out of our meeting, please come ready to talk through a few things:
- Your schedule
- Your business operations
- The goals you'd like to achieve
- The customer experience you'd like to be known for

Also, bring your brand colors. If you don't have brand colors yet, that's okay - I come from a background in branding, so I can help you with that too.

When: ${opts.whenLabel}
A 30-minute ${callType} with Alecia

${howLine}${opts.meetingType !== "phone" && opts.zoom ? `\n${opts.zoom.url}\nMeeting ID ${opts.zoom.meetingId} · Passcode ${opts.zoom.passcode}` : ""}

Can't wait to talk,
Alecia
Founder, Marvberry

Marvberry. Move forward.`

  return { subject: "Your setup session is confirmed", html, text }
}

export function agentNotificationEmail(opts: {
  agentName: string
  clientName: string
  clientEmail: string
  clientPhone: string
  whenLabel: string
  meetingType: string
  lookingTo?: string | null
  notes?: string | null
}) {
  const rows: [string, string][] = [
    ["Client", opts.clientName],
    ["When", opts.whenLabel],
    ["Type", opts.meetingType === "phone" ? "Phone call" : "Video call"],
    ["Phone", opts.clientPhone],
    ["Email", opts.clientEmail],
  ]
  if (opts.lookingTo) rows.push(["Looking to", opts.lookingTo])

  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:20px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">New booking</h1>
      <p style="margin:10px 0 0;color:#16151a;font-size:15px;">${opts.clientName} just booked a consultation.</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f0ee;border-radius:10px;padding:16px;">
        ${detailRows(rows)}
      </table>
    </td></tr>
    ${
      opts.notes
        ? `<tr><td style="padding:0 32px 28px;"><p style="margin:0 0 4px;color:#5d5b62;font-size:13px;">Notes</p><p style="margin:0;color:#16151a;font-size:14px;line-height:1.5;">${opts.notes.replace(/</g, "&lt;")}</p></td></tr>`
        : `<tr><td style="height:20px;"></td></tr>`
    }
  `)

  const text = `New booking

${opts.clientName} just booked a consultation.

When: ${opts.whenLabel}
Type: ${opts.meetingType === "phone" ? "Phone call" : "Video call"}
Phone: ${opts.clientPhone}
Email: ${opts.clientEmail}${opts.lookingTo ? `\nLooking to: ${opts.lookingTo}` : ""}${opts.notes ? `\n\nNotes:\n${opts.notes}` : ""}`

  return { subject: `New booking: ${opts.clientName}`, html, text }
}

export function clientReminderEmail(opts: {
  clientFirstName: string
  agentName: string
  whenLabel: string
  meetingType: string
  agentPhone?: string
  agentEmail?: string
  manageUrl?: string
}) {
  const how =
    opts.meetingType === "phone"
      ? `${opts.agentName} will call you at the number you gave.`
      : `${opts.agentName} will send a video link before your call.`
  const contact = [opts.agentPhone, opts.agentEmail].filter(Boolean).join(" &middot; ")

  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">See you soon${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.</h1>
      <p style="margin:12px 0 0;color:#16151a;font-size:15px;line-height:1.5;">A quick reminder about your consultation with ${opts.agentName}:</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f0ee;border-radius:10px;padding:16px;">
        ${detailRows([
          ["When", opts.whenLabel],
          ["Type", opts.meetingType === "phone" ? "Phone call" : "Video call"],
        ])}
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0;color:#16151a;font-size:14px;line-height:1.5;">${how}</p>
    </td></tr>
    ${opts.manageUrl ? manageBlock(opts.manageUrl) : ""}
    ${
      contact
        ? `<tr><td style="padding:8px 32px 28px;"><p style="margin:0;color:#5d5b62;font-size:13px;">Questions? ${contact}</p></td></tr>`
        : `<tr><td style="height:20px;"></td></tr>`
    }
  `)

  const text = `See you soon${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.

A quick reminder about your consultation with ${opts.agentName}.

When: ${opts.whenLabel}
Type: ${opts.meetingType === "phone" ? "Phone call" : "Video call"}

${how}${opts.manageUrl ? `\n\nNeed a different time? Reschedule or cancel: ${opts.manageUrl}` : ""}${[opts.agentPhone, opts.agentEmail].filter(Boolean).length ? `\n\nQuestions? ${[opts.agentPhone, opts.agentEmail].filter(Boolean).join(" · ")}` : ""}`

  return { subject: `Reminder: your consultation with ${opts.agentName}`, html, text }
}

// Client: confirms a new time after they reschedule themselves.
export function clientRescheduledEmail(opts: {
  clientFirstName: string
  agentName: string
  whenLabel: string
  meetingType: string
  manageUrl: string
}) {
  const type = opts.meetingType === "phone" ? "Phone call" : "Video call"
  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">You're all set${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.</h1>
      <p style="margin:12px 0 0;color:#16151a;font-size:15px;line-height:1.5;">Your consultation with ${opts.agentName} has moved to a new time:</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f0ee;border-radius:10px;padding:16px;">
        ${detailRows([
          ["When", opts.whenLabel],
          ["Type", type],
        ])}
      </table>
    </td></tr>
    ${manageBlock(opts.manageUrl)}
    <tr><td style="height:20px;"></td></tr>
  `)
  const text = `You're all set${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.

Your consultation with ${opts.agentName} has moved to a new time.

When: ${opts.whenLabel}
Type: ${type}

Need a different time? Reschedule or cancel: ${opts.manageUrl}`
  return { subject: `New time with ${opts.agentName}`, html, text }
}

// Client: confirms their cancellation.
export function clientCancelledEmail(opts: {
  clientFirstName: string
  agentName: string
  whenLabel: string
  bookingUrl: string
}) {
  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 28px;">
      <h1 style="margin:0;font-size:22px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">Your consultation is cancelled.</h1>
      <p style="margin:12px 0 0;color:#16151a;font-size:15px;line-height:1.5;">Your call with ${opts.agentName} on ${opts.whenLabel} has been cancelled. If you'd like to talk another time, you can <a href="${opts.bookingUrl}" style="color:#16151a;">book a new time here</a>.</p>
    </td></tr>
  `)
  const text = `Your consultation is cancelled.

Your call with ${opts.agentName} on ${opts.whenLabel} has been cancelled.

Book a new time: ${opts.bookingUrl}`
  return { subject: `Cancelled: your consultation with ${opts.agentName}`, html, text }
}

// Agent: a client moved or cancelled their own booking.
export function agentChangeEmail(opts: {
  kind: "rescheduled" | "cancelled"
  clientName: string
  clientEmail: string
  clientPhone: string
  oldWhenLabel: string
  newWhenLabel?: string
}) {
  const moved = opts.kind === "rescheduled"
  const rows: [string, string][] = [["Client", opts.clientName]]
  if (moved) {
    rows.push(["Was", opts.oldWhenLabel], ["Now", opts.newWhenLabel ?? ""])
  } else {
    rows.push(["Was", opts.oldWhenLabel])
  }
  rows.push(["Phone", opts.clientPhone], ["Email", opts.clientEmail])

  const heading = moved ? "Booking rescheduled" : "Booking cancelled"
  const line = moved
    ? `${opts.clientName} moved their consultation to a new time.`
    : `${opts.clientName} cancelled their consultation. The time is open again on your booking page.`

  const html = wrap(`
    <tr><td style="background:#16151a;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:20px;color:#16151a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-0.01em;">${heading}</h1>
      <p style="margin:10px 0 0;color:#16151a;font-size:15px;">${line}</p>
    </td></tr>
    <tr><td style="padding:16px 32px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f0ee;border-radius:10px;padding:16px;">
        ${detailRows(rows)}
      </table>
    </td></tr>
  `)
  const text = `${heading}

${line}

${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`
  return { subject: `${heading}: ${opts.clientName}`, html, text }
}
