"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { isValidOpenSlot, formatSlot } from "@/lib/slots"
import {
  sendEmail,
  manageUrl,
  clientRescheduledEmail,
  clientCancelledEmail,
  agentChangeEmail,
} from "@/lib/email"

export type ManageResult = { ok: true } | { ok: false; error: string }

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Booking = {
  id: string
  agent_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  meeting_type: string
  slot_start: string
}

// Load an upcoming booking and its agent by the private token.
async function load(token: string) {
  if (!uuidRe.test(token)) return null
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from("bookings")
    .select("id, agent_id, first_name, last_name, email, phone, meeting_type, slot_start")
    .eq("manage_token", token)
    .maybeSingle()
  if (!booking) return null
  if (new Date(booking.slot_start as string).getTime() <= Date.now()) return null
  const { data: agent } = await admin
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", booking.agent_id)
    .maybeSingle()
  if (!agent) return null
  return { admin, booking: booking as Booking, agent: agent as AgentRow }
}

async function alertAgent(
  admin: ReturnType<typeof createAdminClient>,
  agent: AgentRow,
  mail: { subject: string; html: string; text: string },
  replyTo: string
) {
  const { data: authUser } = await admin.auth.admin.getUserById(agent.id)
  const to = authUser?.user?.email || agent.public_email
  if (to) await sendEmail({ to, ...mail, fromName: "Marvberry", replyTo })
}

export async function rescheduleBooking(token: string, slotStart: string): Promise<ManageResult> {
  const found = await load(token)
  if (!found) return { ok: false, error: "This booking can no longer be changed." }
  const { admin, booking, agent } = found

  const { data: rows, error: takenErr } = await admin
    .from("bookings")
    .select("slot_start")
    .eq("agent_id", agent.id)
  if (takenErr) return { ok: false, error: "Something went wrong on our end. Please try again." }
  const taken = new Set((rows ?? []).map((r) => new Date(r.slot_start as string).toISOString()))

  if (!isValidOpenSlot(toAgentConfig(agent), slotStart, taken)) {
    return { ok: false, error: "That time was just taken. Please pick another." }
  }

  const { error } = await admin
    .from("bookings")
    .update({ slot_start: slotStart, reminder_sent_at: null })
    .eq("id", booking.id)
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "That time was just taken. Please pick another." }
    }
    return { ok: false, error: "We couldn't move your booking. Please try again." }
  }

  const agentName = agent.full_name || agent.business_name || "your agent"
  const clientName = `${booking.first_name} ${booking.last_name}`.trim()
  const oldWhen = formatSlot(booking.slot_start, agent.timezone)
  const newWhen = formatSlot(slotStart, agent.timezone)

  try {
    const client = clientRescheduledEmail({
      clientFirstName: booking.first_name,
      agentName,
      whenLabel: newWhen,
      meetingType: booking.meeting_type,
      manageUrl: manageUrl(token),
    })
    await sendEmail({
      to: booking.email,
      ...client,
      fromName: agentName,
      replyTo: agent.public_email || undefined,
    })
    const note = agentChangeEmail({
      kind: "rescheduled",
      clientName,
      clientEmail: booking.email,
      clientPhone: booking.phone,
      oldWhenLabel: oldWhen,
      newWhenLabel: newWhen,
    })
    await alertAgent(admin, agent, note, booking.email)
  } catch (err) {
    console.error("[manage] reschedule email failed (booking still moved):", err)
  }

  return { ok: true }
}

export async function cancelBooking(token: string): Promise<ManageResult> {
  const found = await load(token)
  if (!found) return { ok: false, error: "This booking can no longer be changed." }
  const { admin, booking, agent } = found

  // Unlink any client jacket made from this booking, then remove it so the
  // time opens back up on the booking page.
  await admin.from("clients").update({ booking_id: null }).eq("booking_id", booking.id)
  const { error } = await admin.from("bookings").delete().eq("id", booking.id)
  if (error) return { ok: false, error: "We couldn't cancel your booking. Please try again." }

  const agentName = agent.full_name || agent.business_name || "your agent"
  const clientName = `${booking.first_name} ${booking.last_name}`.trim()
  const when = formatSlot(booking.slot_start, agent.timezone)

  try {
    const client = clientCancelledEmail({
      clientFirstName: booking.first_name,
      agentName,
      whenLabel: when,
      bookingUrl: `https://marvberry.com/book/${agent.slug}`,
    })
    await sendEmail({
      to: booking.email,
      ...client,
      fromName: agentName,
      replyTo: agent.public_email || undefined,
    })
    const note = agentChangeEmail({
      kind: "cancelled",
      clientName,
      clientEmail: booking.email,
      clientPhone: booking.phone,
      oldWhenLabel: when,
    })
    await alertAgent(admin, agent, note, booking.email)
  } catch (err) {
    console.error("[manage] cancel email failed (booking still cancelled):", err)
  }

  return { ok: true }
}
