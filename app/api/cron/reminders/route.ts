import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatSlot } from "@/lib/slots"
import { sendEmail, clientReminderEmail, manageUrl } from "@/lib/email"
import { agentDayEmail } from "@/lib/nudge-email"
import { agentDueLabel, daysUntil, nudgeReady } from "@/lib/due"
import { toOwner } from "@/lib/phases"

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
    .select("id, agent_id, first_name, email, meeting_type, slot_start, manage_token")
    .gte("slot_start", from)
    .lt("slot_start", to)
    .is("reminder_sent_at", null)
  if (error) {
    console.error("[reminders] query failed:", error)
    return NextResponse.json({ error: "query failed" }, { status: 500 })
  }
  const digests = await sendAgentDays(admin)
  if (!bookings?.length) return NextResponse.json({ sent: 0, digests })

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
      manageUrl: b.manage_token ? manageUrl(b.manage_token as string) : undefined,
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

  return NextResponse.json({ sent, digests })
}

// Each realtor's own morning note: what's due today and tomorrow across her
// deals, and how many client reminders are ready for her one tap.
async function sendAgentDays(admin: ReturnType<typeof createAdminClient>) {
  const { data: steps, error } = await admin
    .from("steps")
    .select("agent_id, title, owner, due_on, nudged_at, clients(first_name, last_name)")
    .eq("done", false)
    .not("due_on", "is", null)
  if (error || !steps?.length) return 0

  const agentIds = [...new Set(steps.map((s) => s.agent_id as string))]
  const { data: agents } = await admin.from("agents").select("id, full_name, timezone").in("id", agentIds)

  let sent = 0
  for (const agent of agents ?? []) {
    const tz = agent.timezone || "America/New_York"
    const mine = steps.filter((s) => s.agent_id === agent.id)
    const items = mine
      .filter((s) => {
        const n = daysUntil(s.due_on as string, tz)
        return n === 0 || n === 1
      })
      .map((s) => {
        const c = s.clients as unknown as { first_name: string | null; last_name: string | null } | null
        return {
          client: `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "Client",
          step: s.title as string,
          when: agentDueLabel(s.due_on as string, tz),
        }
      })
    const ready = mine.filter(
      (s) => toOwner(s.owner) === "client" && !s.nudged_at && nudgeReady(s.due_on as string, tz)
    ).length
    if (!items.length && !ready) continue

    const { data: u } = await admin.auth.admin.getUserById(agent.id as string)
    const to = u?.user?.email
    if (!to) continue
    const mail = agentDayEmail({
      firstName: ((agent.full_name as string) || "").trim().split(/\s+/)[0] || "",
      items,
      ready,
      link: "https://marvberry.com/dashboard",
    })
    if (await sendEmail({ to, ...mail, fromName: "Marvberry" })) sent++
  }
  return sent
}
