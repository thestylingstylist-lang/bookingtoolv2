import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatSlot } from "@/lib/slots"
import { sendEmail, clientReminderEmail, manageUrl } from "@/lib/email"
import { agentDayEmail, nudgeEmail } from "@/lib/nudge-email"
import { agentDueLabel, daysUntil, canNudge, nudgeDraft, missingThing } from "@/lib/due"
import { draftReminderFor } from "@/lib/assistant"
import { toOwner } from "@/lib/phases"
import { agentCard } from "@/lib/agent-card"
import { sendCallEmail, scheduleHourEmail, TEAM_TZ, type CallRow } from "@/lib/onboarding-call"

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
  // Realtors who chose "Send reminders for me" get theirs sent first, so the
  // morning note only counts what's still waiting on them.
  const callReminders = await sendCallReminders(admin)
  const autoSent = await sendAutoReminders(admin)
  const digests = await sendAgentDays(admin)
  if (!bookings?.length) return NextResponse.json({ sent: 0, digests, autoSent, callReminders })

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
    const { data: linkRow } = await admin.from("agents").select("meeting_link").eq("id", agent.id).maybeSingle()
    const mail = clientReminderEmail({
      meetingLink: (linkRow as { meeting_link?: string } | null)?.meeting_link || undefined,
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
      card: await agentCard(agent.id),
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

  return NextResponse.json({ sent, digests, autoSent, callReminders })
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
  // Realtors who turned the morning update off in Marvberry AI.
  const { data: offs, error: offErr } = await admin.from("agents").select("id").in("id", agentIds).eq("morning_email", false)
  const skip = new Set(offErr ? [] : (offs ?? []).map((o) => o.id as string))

  let sent = 0
  for (const agent of agents ?? []) {
    if (skip.has(agent.id as string)) continue
    const tz = agent.timezone || "America/New_York"
    const mine = steps.filter((s) => s.agent_id === agent.id)
    const items = mine
      .filter((s) => {
        const n = daysUntil(s.due_on as string, tz)
        return n <= 7
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
      (s) => toOwner(s.owner) === "client" && canNudge(s.due_on as string, s.nudged_at as string | null, tz)
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

// Marvberry Assistant on auto: for each realtor who has it on her plan and
// chose "Send reminders for me", send the reminders that are ready today, in
// her voice and her name — exactly what her one tap would have sent.
async function sendAutoReminders(admin: ReturnType<typeof createAdminClient>) {
  const { data: plans, error: planErr } = await admin.from("assistant_plans").select("agent_id")
  if (planErr || !plans?.length) return 0
  const { data: agents, error: agentErr } = await admin
    .from("agents")
    .select("id, full_name, business_name, public_email, timezone, assistant_auto")
    .in("id", plans.map((p) => p.agent_id as string))
  if (agentErr) return 0
  // Auto only when reminders are on too.
  const { data: remOff, error: remErr } = await admin
    .from("agents")
    .select("id")
    .in("id", plans.map((p) => p.agent_id as string))
    .eq("assistant_reminders", false)
  const noRem = new Set(remErr ? [] : (remOff ?? []).map((o) => o.id as string))
  const autos = (agents ?? []).filter((a) => a.assistant_auto && !noRem.has(a.id as string))
  if (!autos.length) return 0

  const { data: steps } = await admin
    .from("steps")
    .select("id, agent_id, client_id, title, owner, phase, due_on, nudged_at, clients(first_name, email, portal_token, phase)")
    .in("agent_id", autos.map((a) => a.id as string))
    .eq("done", false)
    .not("due_on", "is", null)
  if (!steps?.length) return 0

  let sent = 0
  for (const agent of autos) {
    const tz = (agent.timezone as string) || "America/New_York"
    const agentName = (agent.full_name as string) || (agent.business_name as string) || "Your agent"
    const agentFirst = ((agent.full_name as string) || "").trim().split(/\s+/)[0] || ""
    const { data: u } = await admin.auth.admin.getUserById(agent.id as string)

    for (const s of steps.filter((x) => x.agent_id === agent.id)) {
      if (toOwner(s.owner) !== "client" || !canNudge(s.due_on as string, s.nudged_at as string | null, tz)) continue
      const c = s.clients as unknown as { first_name: string | null; email: string | null; portal_token: string | null; phase: string | null } | null
      if (!c?.email || !c.portal_token) continue

      let missingDocs = 0
      if (/document/i.test(s.title as string)) {
        const { count } = await admin
          .from("collected_docs")
          .select("id", { count: "exact", head: true })
          .eq("client_id", s.client_id as string)
          .eq("received", false)
        missingDocs = count ?? 0
      }
      const body =
        (await draftReminderFor(admin, agent.id as string, s.id as string)) ||
        nudgeDraft({
          clientFirst: c.first_name ?? "",
          thing: missingThing(s.title as string),
          due: s.due_on as string,
          tz,
          agentFirst,
          missingDocs,
          phase: (s.phase as string | null) ?? c.phase,
        })

      const mail = nudgeEmail({ agentName, body, link: `https://www.marvberry.com/portal/${c.portal_token}` })
      const ok = await sendEmail({
        to: c.email,
        ...mail,
        fromName: agentName,
        card: await agentCard(agent.id as string),
        replyTo: (agent.public_email as string) || u?.user?.email || undefined,
      })
      if (!ok) continue
      await Promise.all([
        admin.from("messages").insert({ agent_id: agent.id, client_id: s.client_id, sender: "agent", body }),
        admin.from("steps").update({ nudged_at: new Date().toISOString() }).eq("id", s.id as string),
      ])
      sent++
    }
  }
  return sent
}

// Follow-up calls the team booked with a realtor: the day-before reminder, and
// the hour-before email handed to Resend once the call is close enough.
async function sendCallReminders(admin: ReturnType<typeof createAdminClient>) {
  const now = Date.now()
  const { data: calls, error } = await admin
    .from("onboarding_calls")
    .select("id, agent_id, call_at, how, note, owner, day_sent_at, hour_email_id")
    .is("cancelled_at", null)
    .gte("call_at", new Date(now + 60 * 60 * 1000).toISOString())
    .lt("call_at", new Date(now + 60 * 60 * 60 * 1000).toISOString())
  if (error || !calls?.length) return 0
  let sent = 0
  for (const c of calls) {
    const [{ data: ag }, { data: au }] = await Promise.all([
      admin.from("agents").select("full_name, timezone, public_phone").eq("id", c.agent_id as string).maybeSingle(),
      admin.auth.admin.getUserById(c.agent_id as string),
    ])
    const email = au?.user?.email
    if (!email) continue
    const who = {
      first: ((ag?.full_name as string) || "").trim().split(/\s+/)[0],
      email,
      tz: (ag?.timezone as string) || TEAM_TZ,
      phone: (ag?.public_phone as string) || "",
    }
    const update: Record<string, string> = {}
    const hoursAway = (new Date(c.call_at as string).getTime() - now) / 3600000
    if (!c.day_sent_at && hoursAway <= 36 && (await sendCallEmail("day", c as unknown as CallRow, who))) {
      update.day_sent_at = new Date().toISOString()
      sent++
    }
    if (!c.hour_email_id) {
      const id = await scheduleHourEmail(c as unknown as CallRow, who)
      if (id) update.hour_email_id = id
    }
    if (Object.keys(update).length) await admin.from("onboarding_calls").update(update).eq("id", c.id as string)
  }
  return sent
}
