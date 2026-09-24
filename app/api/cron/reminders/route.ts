import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatSlot } from "@/lib/slots"
import { sendEmail, clientReminderEmail } from "@/lib/email"

// Runs once a day (see vercel.json). Finds consultations starting roughly
// 12 to 36 hours from now that haven't had a reminder yet, and emails each
// client once. reminder_sent_at makes it safe to run more than once.

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()
  const from = new Date(now + 12 * 3600_000).toISOString()
  const to = new Date(now + 36 * 3600_000).toISOString()

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id, agent_id, first_name, email, meeting_type, slot_start")
    .gte("slot_start", from)
    .lt("slot_start", to)
    .is("reminder_sent_at", null)
  if (error) {
    console.error("[reminders] query failed:", error)
    return NextResponse.json({ error: "query failed" }, { status: 500 })
  }
  if (!bookings?.length) return NextResponse.json({ sent: 0 })

  const agentIds = [...new Set(bookings.map((b) => b.agent_id as string))]
  const { data: agents } = await admin
    .from("agents")
    .select("id, full_name, business_name, timezone, public_phone, public_email")
    .in("id", agentIds)
  const byId = new Map((agents ?? []).map((a) => [a.id as string, a]))

  let sent = 0
  for (const b of bookings) {
    const agent = byId.get(b.agent_id as string)
    if (!agent) continue
    const agentName = agent.full_name || agent.business_name || "your agent"
    const mail = clientReminderEmail({
      clientFirstName: b.first_name as string,
      agentName,
      whenLabel: formatSlot(b.slot_start as string, agent.timezone || "America/New_York"),
      meetingType: b.meeting_type as string,
      agentPhone: agent.public_phone || undefined,
      agentEmail: agent.public_email || undefined,
    })
    const ok = await sendEmail({
      to: b.email as string,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      fromName: agentName,
      replyTo: agent.public_email || undefined,
    })
    if (ok) {
      await admin
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", b.id)
      sent++
    }
  }

  return NextResponse.json({ sent })
}
