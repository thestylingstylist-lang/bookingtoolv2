import "server-only"
import { formatInTimeZone } from "date-fns-tz"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateSlots } from "@/lib/slots"
import { CHAT_CFG } from "@/app/chat/config"
import { takenChatSlots } from "@/app/chat/taken"
import { bookChat } from "@/app/chat/actions"

// The agent's private fitting with the Marvberry team: is one booked, what's open, and booking one.

export async function fittingStatus(email: string, tz: string): Promise<{ booked: boolean; when: string }> {
  if (!email) return { booked: false, when: "" }
  try {
    const { data } = await createAdminClient()
      .from("sales_leads")
      .select("call_at")
      .ilike("email", email)
      .not("call_at", "is", null)
      .order("call_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const at = data?.call_at as string | undefined
    // Only a fitting still ahead counts as booked.
    if (!at || Date.parse(at) < Date.now() - 60 * 60 * 1000) return { booked: false, when: "" }
    return { booked: true, when: formatInTimeZone(new Date(at), tz, "EEEE, MMMM d 'at' h:mm a") }
  } catch {
    return { booked: false, when: "" }
  }
}

// Open fitting times, in the agent's time zone. Optionally one day (YYYY-MM-DD in their zone).
export async function fittingTimes(tz: string, day?: string) {
  const slots = generateSlots(CHAT_CFG, await takenChatSlots())
  return slots
    .filter((s) => !day || formatInTimeZone(new Date(s.startISO), tz, "yyyy-MM-dd") === day)
    .slice(0, day ? 12 : 10)
    .map((s) => ({ start: s.startISO, label: formatInTimeZone(new Date(s.startISO), tz, "EEE MMM d, h:mm a") }))
}

export async function bookFitting(o: { first: string; last: string; email: string; phone: string; how: "phone" | "virtual"; start: string }) {
  const fd = new FormData()
  fd.set("firstName", o.first)
  fd.set("lastName", o.last || o.first)
  fd.set("email", o.email)
  fd.set("phone", o.phone)
  fd.set("meetingType", o.how)
  fd.set("slotStart", o.start)
  fd.set("role", "Solo agent")
  fd.set("notes", "Booked through Diana: set up the agent's agreement template.")
  return bookChat(fd)
}
