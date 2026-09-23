"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig, MEETING_TYPES, type MeetingType } from "@/lib/config"
import { isValidOpenSlot, formatSlot } from "@/lib/slots"
import {
  sendEmail,
  clientConfirmationEmail,
  agentNotificationEmail,
} from "@/lib/email"

export type BookingResult = { ok: true } | { ok: false; error: string }

const LOOKING_TO = ["Buy", "Sell", "Buy and sell", "Returning client"] as const

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createBooking(
  slug: string,
  formData: FormData
): Promise<BookingResult> {
  const agent = await getAgentBySlug(slug)
  if (!agent) return { ok: false, error: "This booking page is no longer available." }

  const firstName = String(formData.get("firstName") ?? "").trim()
  const lastName = String(formData.get("lastName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const meetingType = String(formData.get("meetingType") ?? "").trim() as MeetingType
  const slotStart = String(formData.get("slotStart") ?? "").trim()
  const lookingToRaw = String(formData.get("lookingTo") ?? "").trim()
  const lookingTo = (LOOKING_TO as readonly string[]).includes(lookingToRaw) ? lookingToRaw : null
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null

  if (!firstName || !lastName) return { ok: false, error: "Please enter your first and last name." }
  if (!phone) return { ok: false, error: "Please enter a phone number." }
  if (!email) return { ok: false, error: "Please enter an email address." }
  if (!emailRe.test(email)) return { ok: false, error: "That email doesn't look right. Check it and try again." }
  if (!(MEETING_TYPES as readonly string[]).includes(meetingType))
    return { ok: false, error: "Choose a phone or video call." }
  if (!slotStart) return { ok: false, error: "Pick a time slot to continue." }

  const admin = createAdminClient()
  const cfg = toAgentConfig(agent)

  let taken: Set<string>
  try {
    const { data, error } = await admin
      .from("bookings")
      .select("slot_start")
      .eq("agent_id", agent.id)
    if (error) throw error
    taken = new Set((data ?? []).map((r) => new Date(r.slot_start as string).toISOString()))
  } catch {
    return { ok: false, error: "Something went wrong on our end. Please try again." }
  }

  if (!isValidOpenSlot(cfg, slotStart, taken)) {
    return { ok: false, error: "That time was just taken. Please pick another slot." }
  }

  const base = {
    agent_id: agent.id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    meeting_type: meetingType,
    slot_start: slotStart,
  }

  // Save the extra answers if the database has the columns; if the
  // columns haven't been added yet, still save the booking itself.
  let { error } = await admin.from("bookings").insert({ ...base, looking_to: lookingTo, notes })
  const code = (error as { code?: string } | null)?.code
  if (error && (code === "PGRST204" || code === "42703")) {
    ;({ error } = await admin.from("bookings").insert(base))
  }

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "That time was just taken. Please pick another slot." }
    }
    return { ok: false, error: "We couldn't save your booking. Please try again." }
  }

  // Booking is saved. Send the emails, but never let an email failure turn a
  // successful booking into an error for the client. formatSlot renders the
  // time in the agent's own timezone so it matches what they see on the page.
  const whenLabel = formatSlot(slotStart, agent.timezone)
  const agentName = agent.full_name || agent.business_name || "your agent"
  const clientName = `${firstName} ${lastName}`.trim()

  try {
    const client = clientConfirmationEmail({
      clientFirstName: firstName,
      agentName,
      whenLabel,
      meetingType,
      agentPhone: agent.public_phone || undefined,
      agentEmail: agent.public_email || undefined,
    })
    await sendEmail({
      to: email,
      subject: client.subject,
      html: client.html,
      text: client.text,
      fromName: agentName,
      replyTo: agent.public_email || undefined,
    })

    // Booking alerts go to the realtor's account (sign-in) email.
    const { data: authUser } = await admin.auth.admin.getUserById(agent.id)
    const alertEmail = authUser?.user?.email || agent.public_email
    if (alertEmail) {
      const note = agentNotificationEmail({
        agentName,
        clientName,
        clientEmail: email,
        clientPhone: phone,
        whenLabel,
        meetingType,
        lookingTo,
        notes,
      })
      await sendEmail({
        to: alertEmail,
        subject: note.subject,
        html: note.html,
        text: note.text,
        fromName: "Marvberry",
        replyTo: email,
      })
    }
  } catch (err) {
    console.error("[booking] email step failed (booking still saved):", err)
  }

  return { ok: true }
}
