import "server-only"
import { formatInTimeZone } from "date-fns-tz"
import { teamNote, para, button, small, esc } from "@/lib/letter"
import { sendEmail, scheduleEmail } from "@/lib/email"
import { CHAT_HOST, CHAT_ZOOM } from "@/app/chat/config"

// Follow-up calls between the Marvberry team and a realtor: the emails.
export const TEAM_TZ = "America/New_York"

export type CallRow = { id: string; agent_id: string; call_at: string; how: "video" | "phone"; note: string; owner: string }
export type CallFor = { first: string; email: string; tz: string; phone: string }

function whenFor(iso: string, tz: string) {
  return formatInTimeZone(new Date(iso), tz, "EEEE, MMMM d 'at' h:mm a zzz").replace(":00 ", " ")
}

function howLines(c: CallRow, who: CallFor) {
  if (c.how === "phone") {
    return {
      html: para(`I&rsquo;ll call you${who.phone ? ` at ${esc(who.phone)}` : ""}.`),
      text: `I'll call you${who.phone ? ` at ${who.phone}` : ""}.`,
      btn: "",
    }
  }
  return {
    html: para(`We&rsquo;ll meet on Zoom. Meeting ID ${esc(CHAT_ZOOM.meetingId)}, passcode ${esc(CHAT_ZOOM.passcode)}.`),
    text: `We'll meet on Zoom: ${CHAT_ZOOM.url}\nMeeting ID ${CHAT_ZOOM.meetingId}, passcode ${CHAT_ZOOM.passcode}.`,
    btn: button(CHAT_ZOOM.url, "Join on Zoom"),
  }
}

function letter(kind: "booked" | "day" | "hour" | "cancelled", c: CallRow, who: CallFor) {
  const when = whenFor(c.call_at, who.tz)
  const hi = `Hi${who.first ? ` ${esc(who.first)}` : ""},`
  const hiT = `Hi${who.first ? ` ${who.first}` : ""},`
  const about = c.note ? para(`We&rsquo;ll go over: ${esc(c.note)}`) : ""
  const aboutT = c.note ? `We'll go over: ${c.note}\n\n` : ""
  const h = howLines(c, who)
  const sign = small(`Something come up? Just reply to this email. ${esc(c.owner)}`)
  const signT = `Something come up? Just reply to this email.\n${c.owner}`

  if (kind === "cancelled") {
    return {
      subject: "Our call is cancelled",
      html: teamNote("Our call is cancelled.", para(`${hi} I&rsquo;ve cancelled our call on ${esc(when)}. I&rsquo;ll reach out to find a new time.`) + small(esc(c.owner))),
      text: `${hiT} I've cancelled our call on ${when}. I'll reach out to find a new time.\n\n${c.owner}`,
    }
  }
  const top =
    kind === "booked"
      ? { s: `Our call: ${when}`, h: "Our call is on the calendar.", p: `${hi} I&rsquo;ve set up a call with you on <strong>${esc(when)}</strong>.`, t: `${hiT} I've set up a call with you on ${when}.` }
      : kind === "day"
        ? { s: `Tomorrow: our call at ${formatInTimeZone(new Date(c.call_at), who.tz, "h:mm a").replace(":00 ", " ")}`, h: "See you tomorrow.", p: `${hi} a quick reminder: our call is <strong>${esc(when)}</strong>.`, t: `${hiT} a quick reminder: our call is ${when}.` }
        : { s: "Our call starts in an hour", h: "See you in an hour.", p: `${hi} our call starts in an hour, <strong>${esc(when)}</strong>.`, t: `${hiT} our call starts in an hour, ${when}.` }
  return {
    subject: top.s,
    html: teamNote(top.h, para(top.p) + about + h.html + h.btn + sign),
    text: `${top.t}\n\n${aboutT}${h.text}\n\n${signT}`,
  }
}

const from = (c: CallRow) => ({ fromName: `${c.owner} at Marvberry`, replyTo: CHAT_HOST.email })

export async function sendCallEmail(kind: "booked" | "day" | "cancelled", c: CallRow, who: CallFor) {
  const m = letter(kind, c, who)
  return sendEmail({ to: who.email, ...m, ...from(c) })
}

// The hour-before email, held by Resend until then. Only when the call is
// within three days (Resend's limit); the morning job picks up the rest.
export async function scheduleHourEmail(c: CallRow, who: CallFor): Promise<string | null> {
  const at = new Date(new Date(c.call_at).getTime() - 60 * 60 * 1000)
  const now = Date.now()
  if (at.getTime() < now + 5 * 60 * 1000 || at.getTime() > now + 70 * 60 * 60 * 1000) return null
  const m = letter("hour", c, who)
  return scheduleEmail({ to: who.email, ...m, ...from(c), at })
}
