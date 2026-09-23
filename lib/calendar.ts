// Add-to-calendar helpers: Google + Outlook links, and an .ics file (Apple & everything else).

export type CalEvent = {
  title: string
  details: string
  startISO: string
  minutes: number
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

function endOf(e: CalEvent) {
  return new Date(new Date(e.startISO).getTime() + e.minutes * 60_000)
}

export function googleCalendarUrl(e: CalEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(new Date(e.startISO))}/${stamp(endOf(e))}`,
    details: e.details,
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function outlookCalendarUrl(e: CalEvent) {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.startISO).toISOString(),
    enddt: endOf(e).toISOString(),
    body: e.details,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`
}

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

export function icsFile(e: CalEvent, uid: string) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Marvberry//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@marvberry.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(e.startISO))}`,
    `DTEND:${stamp(endOf(e))}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}

export function consultationEvent(opts: {
  agentName: string
  startISO: string
  minutes: number
  meetingType: string
  agentPhone?: string
  agentEmail?: string
}): CalEvent {
  const who = opts.agentName || "your agent"
  const how =
    opts.meetingType === "phone"
      ? `${who} will call you at the number you provided.`
      : `${who} will send you the video link before the call.`
  const contact = [opts.agentPhone, opts.agentEmail].filter(Boolean).join(" · ")
  return {
    title: `Consultation with ${who}`,
    details: contact ? `${how}\n\nQuestions? ${contact}` : how,
    startISO: opts.startISO,
    minutes: opts.minutes,
  }
}
