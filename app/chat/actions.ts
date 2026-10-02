"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { MEETING_TYPES, type MeetingType } from "@/lib/config"
import { isValidOpenSlot, formatSlot } from "@/lib/slots"
import { sendEmail, chatConfirmationEmail, agentNotificationEmail } from "@/lib/email"
import type { BookingResult } from "@/app/book/[slug]/actions"
import { CHAT_CFG, CHAT_HOST } from "./config"
import { takenChatSlots } from "./taken"

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function bookChat(formData: FormData): Promise<BookingResult> {
  const firstName = String(formData.get("firstName") ?? "").trim()
  const lastName = String(formData.get("lastName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const meetingType = String(formData.get("meetingType") ?? "").trim() as MeetingType
  const slotStart = String(formData.get("slotStart") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000)
  const role = String(formData.get("role") ?? "").trim()

  if (!firstName || !lastName) return { ok: false, error: "Please enter your first and last name." }
  if (!phone) return { ok: false, error: "Please enter a phone number." }
  if (!email || !emailRe.test(email)) return { ok: false, error: "That email doesn't look right. Check it and try again." }
  if (!(MEETING_TYPES as readonly string[]).includes(meetingType))
    return { ok: false, error: "Choose a phone or video call." }
  if (role !== "Solo realtor" && role !== "Broker")
    return { ok: false, error: "Tell me if you\u2019re a solo realtor or a broker." }
  if (!slotStart) return { ok: false, error: "Pick a time slot to continue." }

  const taken = await takenChatSlots()
  if (!isValidOpenSlot(CHAT_CFG, slotStart, taken)) {
    return { ok: false, error: "That time was just taken. Please pick another slot." }
  }

  const admin = createAdminClient()
  const name = `${firstName} ${lastName}`.trim()
  const how = meetingType === "phone" ? "Phone call" : "Video call"
  const noteLine = [role, how, notes].filter(Boolean).join(" — ")

  try {
    const { data: existing } = await admin
      .from("sales_leads")
      .select("id, notes")
      .ilike("email", email)
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      const merged = [existing.notes, noteLine].filter(Boolean).join("\n")
      const { error } = await admin
        .from("sales_leads")
        .update({ name, phone, stage: "call_booked", call_at: slotStart, notes: merged })
        .eq("id", existing.id)
      if (error) throw error
    } else {
      const { error } = await admin.from("sales_leads").insert({
        name, email, phone, source: "chat link", stage: "call_booked", call_at: slotStart, notes: noteLine,
      })
      if (error) throw error
    }
  } catch {
    return { ok: false, error: "We couldn't save your booking. Please try again." }
  }

  revalidatePath("/admin/sales")
  revalidatePath("/chat")

  const whenLabel = formatSlot(slotStart, CHAT_CFG.timezone)
  try {
    const c = chatConfirmationEmail({
      clientFirstName: firstName,
      whenLabel,
      meetingType,
    })
    await sendEmail({ to: email, subject: c.subject, html: c.html, text: c.text, fromName: "Alecia at Marvberry", replyTo: CHAT_HOST.email })

    const n = agentNotificationEmail({
      agentName: CHAT_HOST.first,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      whenLabel,
      meetingType,
      lookingTo: null,
      notes: [role, notes].filter(Boolean).join(" \u2014 ") || null,
    })
    await sendEmail({ to: CHAT_HOST.email, subject: n.subject, html: n.html, text: n.text, fromName: "Marvberry", replyTo: email })
  } catch (err) {
    console.error("[chat] email step failed (booking still saved):", err)
  }

  return { ok: true, manageToken: null }
}
