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

const wrap = (inner: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f3ef;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f3ef;padding:32px 0;">
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
        `<tr><td style="padding:4px 0;color:#8a7872;font-size:13px;width:120px;">${k}</td><td style="padding:4px 0;color:#3d3230;font-size:14px;font-weight:600;">${v}</td></tr>`
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
}) {
  const how =
    opts.meetingType === "phone"
      ? `${opts.agentName} will call you at the number you gave.`
      : `${opts.agentName} will send a video link before your call.`
  const contact = [opts.agentPhone, opts.agentEmail].filter(Boolean).join(" &middot; ")

  const html = wrap(`
    <tr><td style="background:#b08477;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#1c1a19;font-family:Georgia,serif;">You're booked${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.</h1>
      <p style="margin:12px 0 0;color:#3d3230;font-size:15px;line-height:1.5;">Your consultation with ${opts.agentName} is confirmed. Here are the details:</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f3ef;border-radius:10px;padding:16px;">
        ${detailRows([
          ["When", opts.whenLabel],
          ["Type", opts.meetingType === "phone" ? "Phone call" : "Video call"],
        ])}
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0;color:#3d3230;font-size:14px;line-height:1.5;">${how}</p>
    </td></tr>
    ${
      contact
        ? `<tr><td style="padding:8px 32px 28px;"><p style="margin:0;color:#8a7872;font-size:13px;">Questions? ${contact}</p></td></tr>`
        : `<tr><td style="height:20px;"></td></tr>`
    }
  `)

  const text = `You're booked${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.

Your consultation with ${opts.agentName} is confirmed.

When: ${opts.whenLabel}
Type: ${opts.meetingType === "phone" ? "Phone call" : "Video call"}

${how}${contact ? `\n\nQuestions? ${[opts.agentPhone, opts.agentEmail].filter(Boolean).join(" · ")}` : ""}`

  return { subject: `You're booked with ${opts.agentName}`, html, text }
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
    <tr><td style="background:#1c1a19;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:20px;color:#1c1a19;font-family:Georgia,serif;">New booking</h1>
      <p style="margin:10px 0 0;color:#3d3230;font-size:15px;">${opts.clientName} just booked a consultation.</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f3ef;border-radius:10px;padding:16px;">
        ${detailRows(rows)}
      </table>
    </td></tr>
    ${
      opts.notes
        ? `<tr><td style="padding:0 32px 28px;"><p style="margin:0 0 4px;color:#8a7872;font-size:13px;">Notes</p><p style="margin:0;color:#3d3230;font-size:14px;line-height:1.5;">${opts.notes.replace(/</g, "&lt;")}</p></td></tr>`
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
}) {
  const how =
    opts.meetingType === "phone"
      ? `${opts.agentName} will call you at the number you gave.`
      : `${opts.agentName} will send a video link before your call.`
  const contact = [opts.agentPhone, opts.agentEmail].filter(Boolean).join(" &middot; ")

  const html = wrap(`
    <tr><td style="background:#b08477;height:6px;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:22px;color:#1c1a19;font-family:Georgia,serif;">See you soon${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.</h1>
      <p style="margin:12px 0 0;color:#3d3230;font-size:15px;line-height:1.5;">A quick reminder about your consultation with ${opts.agentName}:</p>
    </td></tr>
    <tr><td style="padding:16px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f3ef;border-radius:10px;padding:16px;">
        ${detailRows([
          ["When", opts.whenLabel],
          ["Type", opts.meetingType === "phone" ? "Phone call" : "Video call"],
        ])}
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 8px;">
      <p style="margin:0;color:#3d3230;font-size:14px;line-height:1.5;">${how}</p>
    </td></tr>
    ${
      contact
        ? `<tr><td style="padding:8px 32px 28px;"><p style="margin:0;color:#8a7872;font-size:13px;">Need to change something? ${contact}</p></td></tr>`
        : `<tr><td style="height:20px;"></td></tr>`
    }
  `)

  const text = `See you soon${opts.clientFirstName ? ", " + opts.clientFirstName : ""}.

A quick reminder about your consultation with ${opts.agentName}.

When: ${opts.whenLabel}
Type: ${opts.meetingType === "phone" ? "Phone call" : "Video call"}

${how}${[opts.agentPhone, opts.agentEmail].filter(Boolean).length ? `\n\nNeed to change something? ${[opts.agentPhone, opts.agentEmail].filter(Boolean).join(" · ")}` : ""}`

  return { subject: `Reminder: your consultation with ${opts.agentName}`, html, text }
}
