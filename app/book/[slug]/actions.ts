"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig, MEETING_TYPES, type MeetingType } from "@/lib/config"
import { isValidOpenSlot } from "@/lib/slots"

export type BookingResult = { ok: true } | { ok: false; error: string }

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

  if (!firstName || !lastName) return { ok: false, error: "Please enter your first and last name." }
  if (!phone) return { ok: false, error: "Please enter a phone number." }
  if (!email) return { ok: false, error: "Please enter an email address." }
  if (!emailRe.test(email)) return { ok: false, error: "That email doesn't look right. Check it and try again." }
  if (!(MEETING_TYPES as readonly string[]).includes(meetingType))
    return { ok: false, error: "Choose a virtual or phone consultation." }
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

  const { error } = await admin.from("bookings").insert({
    agent_id: agent.id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    meeting_type: meetingType,
    slot_start: slotStart,
  })

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "That time was just taken. Please pick another slot." }
    }
    return { ok: false, error: "We couldn't save your booking. Please try again." }
  }

  return { ok: true }
}
