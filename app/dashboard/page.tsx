import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatSlot } from "@/lib/slots"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { SETUP_STEPS, setupProgress } from "@/lib/onboarding"
import Welcome from "./welcome"
import AssistantBar from "./assistant-bar"
import { feedToken } from "@/lib/feed"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"
import { isAdminEmail } from "@/lib/admin"
import { agentDueLabel, daysUntil, isClose, nudgeDraft, missingThing, canNudge, clientDueLabel } from "@/lib/due"
import { toOwner } from "@/lib/phases"
import { suiteName } from "@/lib/suite"
import { assistantDisplayName } from "@/lib/assistant-name"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { loadDeals, stageLine, loadFollowUps } from "@/lib/business-picture"
import { cookies } from "next/headers"
import { SEEN_COOKIE, sinceFrom } from "@/lib/whats-new-shared"
import SeenMarker from "./seen-marker"
import { createAdminClient } from "@/lib/supabase/admin"
import SupportThread, { type Msg } from "@/app/support/support-thread"
import SetupUpload from "./setup-upload"

// The client's outstanding item, said about them (agent-facing, calm, no blame).
function theirThing(title: string, first: string) {
  const t = title.trim().toLowerCase()
  const map: Record<string, string> = {
    "collect the client's documents": "documents",
    "buyer sent their criteria": "wish list",
    "get their availability": "showing times",
    "agreement signed": "signed agreement",
  }
  const thing = map[t] ?? title.trim().replace(/^(send|upload|sign|get|collect|provide|share|submit|bring|email)\s+/i, "").replace(/^(the|their|your)\s+/i, "").toLowerCase()
  const plural = /s$/.test(thing) && !/ss$/.test(thing)
  return `Still waiting on ${first}'s ${thing}.`
}

type Priority = { key: string; line: string; sub: string; href: string; open: string; action?: string; urgent?: boolean }

type DueStep = {
  id: string
  title: string
  owner: string | null
  phase: string | null
  due_on: string
  nudged_at: string | null
  client_id: string
  clients: { first_name: string | null; last_name: string | null; email: string | null; portal_token: string | null } | null
}

export const dynamic = "force-dynamic"

export default async function HomePage({ searchParams }: { searchParams: Promise<{ nudge?: string; welcome?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  // The team account gets the admin space, not an agent dashboard.
  if (isAdminEmail(user.email)) redirect("/admin")

  const { data: agentData } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")
  const { data: named } = await supabase.from("agents").select("assistant_name").eq("id", user.id).maybeSingle()
  const assistantName = assistantDisplayName(named?.assistant_name)

  const nowISO = new Date().toISOString()
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, first_name, last_name, meeting_type, slot_start")
    .gte("slot_start", nowISO)
    .order("slot_start", { ascending: true })
    .limit(5)
  const next = upcoming ?? []
  // Bookings already turned into clients open that client; the rest open Bookings, where they become one.
  const { data: madeClients } = await supabase.from("clients").select("id, booking_id").not("booking_id", "is", null)
  const clientFor = new Map((madeClients ?? []).map((c) => [c.booking_id as string, c.id as string]))

  // New from clients: what they did that she hasn't seen yet (blank until client-activity.sql is run).
  const { data: actRows, error: actErr } = await supabase
    .from("client_activity")
    .select("client_id, kind, line, created_at")
    .is("seen_at", null)
    .order("created_at", { ascending: false })
    .limit(200)
  const unseenActs = (actErr ? [] : (actRows ?? [])) as { client_id: string; kind: string; line: string; created_at: string }[]
  const newByClient = new Map<string, { line: string; count: number }>()
  for (const r of unseenActs) {
    const f = newByClient.get(r.client_id)
    if (f) f.count++
    else newByClient.set(r.client_id, { line: r.line, count: 1 })
  }

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })

  // greeting by the agent's own timezone
  let hour = new Date().getHours()
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: agent.timezone }).format(new Date())
    )
  } catch {}
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = agent.full_name ? agent.full_name.split(" ")[0] : ""

  // count of upcoming consultations today (in agent tz, approximated by all future today)
  const upcomingCount = next.length

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })

  // Due dates across every deal: what's coming up, and client reminders ready to send.
  const tz = agent.timezone || "America/New_York"
  const { data: dueData } = await supabase
    .from("steps")
    .select("id, title, owner, phase, due_on, nudged_at, client_id, clients(first_name, last_name, email, portal_token, client_type)")
    .eq("done", false)
    .not("due_on", "is", null)
    .order("due_on", { ascending: true })
  const dueSteps = ((dueData ?? []) as unknown as DueStep[]).filter((d) => daysUntil(d.due_on, tz) <= 7)
  const ready = dueSteps.filter((d) => toOwner(d.owner) === "client" && canNudge(d.due_on, d.nudged_at, tz))
  const pastDue = dueSteps.filter((d) => daysUntil(d.due_on, tz) < 0)
  const comingUp = dueSteps.filter((d) => daysUntil(d.due_on, tz) >= 0)

  // Real count of documents still outstanding, per client with a ready reminder.
  const readyClientIds = [...new Set(ready.map((d) => d.client_id))]
  const missingByClient = new Map<string, number>()
  if (readyClientIds.length) {
    const { data: colRows } = await supabase
      .from("collected_docs")
      .select("client_id, received")
      .in("client_id", readyClientIds)
    for (const cid of readyClientIds) {
      const rows = (colRows ?? []).filter((r) => r.client_id === cid)
      // If we track a document list for them, count the not-yet-received ones.
      missingByClient.set(cid, rows.filter((r) => !r.received).length)
    }
  }
  const agentFirstName = (agent.full_name || "").trim().split(/\s+/)[0] || ""
  const clientName = (d: DueStep) => `${d.clients?.first_name ?? ""} ${d.clients?.last_name ?? ""}`.trim() || "Client"

  // The top of home: never more than three, ranked past due, due today, today's calls.
  const todayKey = formatInTimeZone(new Date(), tz, "yyyy-MM-dd")
  const firstOf = (d: DueStep) => d.clients?.first_name?.trim() || "your client"
  const stepPriority = (d: DueStep): Priority => {
    const first = firstOf(d)
    const mine = toOwner(d.owner) !== "client"
    const href = `/clients/${d.client_id}?step=${d.id}#step-${d.id}`
    const late = daysUntil(d.due_on, tz) < 0
    const when = late ? agentDueLabel(d.due_on, tz).replace("Past due · ", "Past due since ") : "Due today"
    const act = !mine && !!d.clients?.email && canNudge(d.due_on, d.nudged_at, tz)
    return {
      key: d.id,
      line: mine ? `Next for ${first}: ${d.title.charAt(0).toLowerCase()}${d.title.slice(1)}.` : theirThing(d.title, first),
      sub: act ? `I've drafted a reminder for ${first}. Read it, then send it when you're ready.` : when,
      href,
      open: act ? when : `Open ${first}`,
      action: act ? "Read and send" : undefined,
      urgent: late,
    }
  }
  const todayCalls: Priority[] = next
    .filter((b) => formatInTimeZone(new Date(b.slot_start), tz, "yyyy-MM-dd") === todayKey)
    .map((b) => ({
      key: b.id,
      line: `Your ${b.meeting_type === "virtual" ? "video call" : "call"} with ${b.first_name} is at ${formatInTimeZone(new Date(b.slot_start), tz, "h:mm a")}.`,
      sub: b.meeting_type === "virtual" ? "Video" : "Phone",
      href: "/calendar",
      open: "See booking",
    }))
  const allPriorities: Priority[] = [
    ...pastDue.map(stepPriority),
    ...comingUp.filter((d) => daysUntil(d.due_on, tz) === 0).map(stepPriority),
    ...todayCalls,
  ]
  const priorities = allPriorities.slice(0, 3)
  const more = allPriorities.length > 3

  // What changed since she last looked. Said only when something did.
  const seenRaw = (await cookies()).get(SEEN_COOKIE)?.value
  const since = sinceFrom(seenRaw, Date.now())

  // Onboarding with the Marvberry team: the "Your setup" card and the chat with
  // their owner. Gone once the team marks onboarding complete.
  const admin = createAdminClient()
  const { data: ob } = await admin
    .from("onboarding")
    .select("owner, completed_at")
    .eq("agent_id", user.id)
    .maybeSingle()
  const onboarding = ob && !ob.completed_at ? { owner: (ob.owner as string) || "Alecia" } : null
  // Promised on the home page: a setup call. Until they book it (or setup is done), keep it at the top.
  let needsSetupCall = false
  let callLabel = ""
  if (!ob?.completed_at && user.email) {
    const { data: lead } = await admin.from("sales_leads").select("call_at").ilike("email", user.email).not("call_at", "is", null).order("call_at", { ascending: false }).limit(1).maybeSingle()
    needsSetupCall = !lead
    if (lead?.call_at) callLabel = formatInTimeZone(new Date(lead.call_at as string), tz, "EEEE, MMMM d 'at' h:mm a")
  }
  // For the onboarding chat: does the agent have an agreement template yet, and where their own agreement uploads to.
  let hasTemplate = false
  let agreementDocId = ""
  if (sp.welcome === "1") {
    const [{ count }, { data: ad }] = await Promise.all([
      supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("agent_id", user.id),
      admin.from("onboarding_docs").select("id").eq("agent_id", user.id).eq("title", "Your buyer agreement").maybeSingle(),
    ])
    hasTemplate = (count ?? 0) > 0
    agreementDocId = (ad?.id as string) || ""
  }
  let setupDocs: { id: string; title: string; file_path: string | null; file_name: string | null; template_built: boolean }[] = []
  let setupThread: Msg[] = []
  if (onboarding) {
    const [{ data: d }, { data: m }] = await Promise.all([
      admin.from("onboarding_docs").select("id, title, file_path, file_name, template_built").eq("agent_id", user.id).order("created_at", { ascending: true }),
      admin.from("support_messages").select("id, body, from_team, created_at").eq("agent_id", user.id).order("created_at", { ascending: true }).limit(200),
    ])
    setupDocs = d ?? []
    setupThread = (m ?? []) as Msg[]
    if (setupThread.some((x) => x.from_team)) {
      await admin.from("support_messages").update({ read_by_agent: true }).eq("agent_id", user.id).eq("from_team", true)
    }
  }
  const sentCount = setupDocs.filter((d) => d.file_path).length

  // The four numbers across the top, and the two panels underneath.
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [{ data: showData }, { count: pendingSigs }, { data: clientMsgs }, { data: signedDocs }] = await Promise.all([
    supabase
      .from("events")
      .select("id, kind, place, starts_at, client_id, clients(first_name, last_name)")
      .gte("starts_at", nowISO)
      .lt("starts_at", weekAhead)
      .order("starts_at", { ascending: true })
      .limit(10),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "sent"),
    supabase
      .from("messages")
      .select("id, body, created_at, client_id, clients(first_name, last_name)")
      .eq("sender", "client")
      .not("body", "is", null)
      .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("documents")
      .select("id, title, signed_at, client_id, clients(first_name, last_name)")
      .eq("status", "signed")
      .gte("signed_at", new Date(Date.now() - 14 * 86400000).toISOString())
      .order("signed_at", { ascending: false })
      .limit(6),
  ])
  type Named = { first_name: string | null; last_name: string | null } | null
  const nameOf = (c: unknown) => {
    const n = c as Named
    return `${n?.first_name ?? ""} ${n?.last_name ?? ""}`.trim() || "A client"
  }
  const showings = ((showData ?? []) as unknown as { id: string; kind: string; place: string; starts_at: string; client_id: string | null; clients: Named }[]).filter((e) => e.kind === "showing")
  const whenLabel = (iso: string) => {
    const k = formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd")
    const time = formatInTimeZone(new Date(iso), tz, "h:mm a")
    if (k === todayKey) return `Today, ${time}`
    if (k === formatInTimeZone(new Date(Date.now() + 86400000), tz, "yyyy-MM-dd")) return `Tomorrow, ${time}`
    return formatInTimeZone(new Date(iso), tz, "EEE, MMM d") + `, ${time}`
  }
  const upcomingRows = [
    ...next.map((b) => ({
      key: `b-${b.id}`,
      at: b.slot_start as string,
      title: `${b.first_name} ${b.last_name ?? ""}`.trim(),
      sub: `Consultation · ${b.meeting_type === "phone" ? "Phone" : "Video"}`,
      href: clientFor.get(b.id) ? `/clients/${clientFor.get(b.id)}` : "/bookings",
    })),
    ...showings.map((e) => ({
      key: `e-${e.id}`,
      at: e.starts_at,
      title: e.place || nameOf(e.clients),
      sub: `Showing${e.clients ? ` · ${nameOf(e.clients)}` : ""}`,
      href: e.client_id ? `/clients/${e.client_id}` : "/calendar",
    })),
  ]
    .sort((x, y) => x.at.localeCompare(y.at))
    .slice(0, 5)
  const ago = (iso: string) => {
    const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (m < 60) return `${m}m ago`
    const h = Math.round(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.round(h / 24)}d ago`
  }
  const updates = [
    ...((clientMsgs ?? []) as unknown as { id: string; body: string; created_at: string; client_id: string; clients: Named }[]).map((m) => ({
      key: `m-${m.id}`,
      at: m.created_at,
      who: nameOf(m.clients),
      line: `Sent a message: \u201c${m.body.length > 48 ? m.body.slice(0, 48).trim() + "\u2026" : m.body}\u201d`,
      href: `/clients/${m.client_id}`,
    })),
    ...((signedDocs ?? []) as unknown as { id: string; title: string; signed_at: string; client_id: string; clients: Named }[]).map((d) => ({
      key: `d-${d.id}`,
      at: d.signed_at,
      who: nameOf(d.clients),
      line: `Signed ${d.title}`,
      href: `/clients/${d.client_id}`,
    })),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 5)
  const updatesThisWeek = updates.filter((u) => u.at >= weekAgo).length
  const showingsToday = showings.filter((e) => formatInTimeZone(new Date(e.starts_at), tz, "yyyy-MM-dd") === todayKey).length

  // ── The picture of her business: six boxes under the greeting. ──
  const dayStart = fromZonedTime(`${todayKey}T00:00:00`, tz).toISOString()
  // Midnight to midnight in her time zone (30 hours past midnight is always tomorrow, even across a clock change).
  const tomorrowKey = formatInTimeZone(new Date(Date.parse(dayStart) + 30 * 3600000), tz, "yyyy-MM-dd")
  const dayEndISO = fromZonedTime(`${tomorrowKey}T00:00:00`, tz).toISOString()
  const sinceISO = new Date(since).toISOString()
  type Appt = { at: string; who: string; what: string }
  const [{ data: bookToday }, { data: evToday }, { data: newBooks }, { data: allClients }, cardSaves, cardReqs, deals, follow] = await Promise.all([
    supabase.from("bookings").select("first_name, slot_start").gte("slot_start", dayStart).lt("slot_start", dayEndISO),
    supabase.from("events").select("kind, place, starts_at, clients(first_name)").gte("starts_at", dayStart).lt("starts_at", dayEndISO),
    supabase.from("bookings").select("id, email, client_id, created_at").gte("created_at", sinceISO).limit(200),
    supabase.from("clients").select("id, email, created_at"),
    supabase.from("card_events").select("id", { count: "exact", head: true }).eq("kind", "save").gte("created_at", sinceISO).then((r: { count: number | null }) => r.count ?? 0, () => 0),
    supabase.from("card_requests").select("id", { count: "exact", head: true }).gte("created_at", sinceISO).then((r: { count: number | null }) => r.count ?? 0, () => 0),
    loadDeals(supabase),
    loadFollowUps(supabase, tz),
  ])
  const appts: Appt[] = [
    ...((bookToday ?? []) as { first_name: string; slot_start: string }[]).map((b) => ({ at: b.slot_start, who: (b.first_name || "").trim(), what: "consultation" })),
    ...((evToday ?? []) as unknown as { kind: string; place: string | null; starts_at: string; clients: { first_name: string | null } | null }[]).map((e) => ({
      at: e.starts_at,
      who: (e.clients?.first_name || e.place || "").trim(),
      what: (e.kind || "appointment").replace(/_/g, " "),
    })),
  ].sort((x, y) => x.at.localeCompare(y.at))
  const nextAppt = appts.find((a) => a.at >= nowISO)
  const hourLabel = (iso: string) => formatInTimeZone(new Date(iso), tz, "h:mm a").replace(":00 ", " ")
  // A booking from someone already on her client list is a current client; anyone else is first-time.
  const knownBefore = new Map(((allClients ?? []) as { id: string; email: string | null; created_at: string }[]).filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.created_at]))
  const bookRows = (newBooks ?? []) as { id: string; email: string | null; client_id: string | null; created_at: string }[]
  const currentBooks = bookRows.filter((b) => {
    const k = knownBefore.get((b.email || "").toLowerCase())
    return !!k && k < b.created_at
  }).length
  const firstBooks = bookRows.length - currentBooks
  const kindCount = new Map<string, number>()
  for (const a of unseenActs as { kind?: string }[]) kindCount.set(a.kind || "", (kindCount.get(a.kind || "") ?? 0) + 1)
  const KIND_WORD: Record<string, [string, string]> = {
    note: ["note", "notes"],
    times: ["shared times", "shared times"],
    offer: ["offer request", "offer requests"],
    upload: ["upload", "uploads"],
    booking: ["booked time", "booked times"],
  }
  const actLine = ["note", "times", "offer", "upload", "booking"]
    .filter((k) => kindCount.get(k))
    .map((k) => `${kindCount.get(k)} ${KIND_WORD[k][kindCount.get(k) === 1 ? 0 : 1]}`)
    .join(", ")
  const kept = [...follow.values()].filter((f) => f.kept).length
  const waiting = [...follow.values()].filter((f) => f.waiting && !f.kept).length
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const boxes: { label: string; value: number; line: string; href: string; needs: boolean }[] = [
    {
      label: "Today",
      value: appts.length,
      line: nextAppt ? `Next: ${[hourLabel(nextAppt.at), nextAppt.who, nextAppt.what].filter(Boolean).join(", ")}` : appts.length ? "Done for today" : "Nothing on the calendar",
      href: "/calendar",
      needs: false,
    },
    {
      label: "New bookings",
      value: bookRows.length,
      line: bookRows.length ? [firstBooks ? `${firstBooks} first-time` : "", currentBooks ? plural(currentBooks, "current client", "current clients") : ""].filter(Boolean).join(", ") : "None since your last visit",
      href: "/bookings",
      needs: bookRows.length > 0,
    },
    {
      label: "Card",
      value: cardSaves + cardReqs,
      line: cardSaves + cardReqs ? [cardSaves ? `${cardSaves} saved your contact` : "", cardReqs ? `${cardReqs} reached out` : ""].filter(Boolean).join(", ") : "No new saves or messages",
      href: "/my-card",
      needs: cardReqs > 0,
    },
    {
      label: "New from clients",
      value: unseenActs.length,
      line: actLine || "Nothing new",
      href: unseenActs.length ? "#new-from-clients" : "/clients",
      needs: unseenActs.length > 0,
    },
    {
      label: "Deals",
      value: deals.size,
      line: stageLine(deals) || "No active deals yet",
      href: "/clients?stage=all",
      needs: false,
    },
    {
      label: "Follow-ups due",
      value: follow.size,
      line: follow.size ? [kept ? `${kept} kept for follow-up` : "", waiting ? `${waiting} waiting on you` : ""].filter(Boolean).join(", ") : "All caught up",
      href: "/clients?view=follow-up",
      needs: follow.size > 0,
    },
  ]

  const signals = { agent, bookingCount: count ?? 0 }
  const { complete, done, total } = setupProgress(SETUP_STEPS, signals)

  // ── Needs you today: replies, signatures, new bookings, and anything due. ──
  type Need = { key: string; who: string; line: string; href: string; act: string; at: string }
  const needs: Need[] = []
  const { data: recentMsgs } = await supabase
    .from("messages")
    .select("client_id, sender, body, created_at, clients(first_name, last_name)")
    .not("body", "is", null)
    .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(200)
  const lastByClient = new Map<string, { sender: string; body: string; created_at: string; clients: unknown }>()
  for (const m of (recentMsgs ?? []) as unknown as { client_id: string; sender: string; body: string; created_at: string; clients: unknown }[]) {
    if (!lastByClient.has(m.client_id)) lastByClient.set(m.client_id, m)
  }
  for (const [cid, m] of lastByClient) {
    if (m.sender !== "client") continue // already answered
    const quote = m.body.length > 70 ? m.body.slice(0, 70).trim() + "\u2026" : m.body
    needs.push({ key: `r-${cid}`, who: nameOf(m.clients), line: `Replied: \u201c${quote}\u201d`, href: `/clients/${cid}`, act: "Reply", at: m.created_at })
  }
  const signedSince = new Date(Math.min(since, Date.now() - 2 * 86400000)).toISOString()
  for (const d of (signedDocs ?? []) as unknown as { id: string; title: string; signed_at: string; client_id: string; clients: Named }[]) {
    if (d.signed_at < signedSince) continue
    needs.push({ key: `s-${d.id}`, who: nameOf(d.clients), line: `Signed the ${d.title}`, href: `/clients/${d.client_id}`, act: "Open", at: d.signed_at })
  }
  for (const b of next) {
    if (clientFor.get(b.id)) continue
    needs.push({
      key: `b-${b.id}`,
      who: `${b.first_name} ${b.last_name ?? ""}`.trim(),
      line: `New booking: ${whenLabel(b.slot_start as string)} \u00b7 ${b.meeting_type === "phone" ? "Phone" : "Video"}`,
      href: "/bookings",
      act: "Add as client",
      at: b.slot_start as string,
    })
  }
  for (const d of [...pastDue, ...comingUp.filter((x) => daysUntil(x.due_on, tz) === 0)]) {
    const pr = stepPriority(d)
    needs.push({ key: `d-${d.id}`, who: clientName(d), line: `${pr.line} ${pr.action ? pr.open : pr.sub}`.trim(), href: pr.href, act: pr.action ?? "Open", at: d.due_on })
  }
  const shownNeeds = needs.slice(0, 8)
  const honest = needs.length
    ? `${needs.length === 1 ? "One thing needs" : `${needs.length} things need`} you today.`
    : "Nothing needs you today. Everything is on track."
  const setupLine = !complete || needsSetupCall
  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-4xl px-6 pb-32 pt-12 sm:px-10">
      <h1 className="font-semibold tracking-tight text-3xl sm:text-4xl">
        {greeting}{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2 text-lxink/60">{honest}</p>

      {/* The picture of her business. Gold only where something needs her. */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {boxes.map((x) => (
          <Link
            key={x.label}
            href={x.href}
            className={`group relative flex min-h-[132px] flex-col rounded-[4px] border bg-white/60 px-4 pb-4 pt-3.5 no-underline transition-colors hover:bg-white sm:px-5 ${x.needs ? "border-[rgba(194,164,107,.7)]" : "border-lxink/[0.09]"}`}
          >
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[.12em] text-lxink/55">
              {x.needs && <span className="h-[6px] w-[6px] rounded-full bg-lxgold" aria-label="Needs you" />}
              {x.label}
            </span>
            <span className="mt-1.5 font-lux text-[44px] leading-none text-lxink">{x.value}</span>
            <span className="mt-auto pt-2 text-[13px] leading-snug text-lxink/60">{x.line}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <AssistantBar name={assistantName} />
      </div>

      {/* Setup, in one quiet line. Gone once setup is done. */}
      {setupLine && (
        <p className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-[rgba(194,164,107,.45)] py-3 text-sm text-lxink/70">
          <span>{complete ? "Your booking page is set up." : `Finish setting up: ${done} of ${total} done.`}</span>
          {!complete && (
            <Link href="/start-here" className="border-b border-lxgold text-lxink no-underline">Continue setup</Link>
          )}
          {needsSetupCall && (
            <Link href="/chat" className="border-b border-lxgold text-lxink no-underline">Book your free setup call</Link>
          )}
        </p>
      )}

      <SeenMarker since={since} />
      {sp.welcome === "1" && <Welcome
          first={firstName}
          callLabel={callLabel}
          fullName={agent.full_name || ""}
          brokerage={agent.business_name || ""}
          slug={agent.slug}
          headshot={agent.headshot_url || ""}
          logo={agent.logo_url || ""}
          phone={agent.public_phone || ""}
          weekdays={agent.weekdays || []}
          dayStart={agent.day_start}
          dayEnd={agent.day_end}
          feedPath={`www.marvberry.com/api/calendar/${feedToken(agent.id)}`}
          hasTemplate={hasTemplate}
          agreementDocId={agreementDocId}
        />}

      {sp.nudge && (
        <p className="mt-6 border-l-2 border-lxgold pl-3 text-sm text-lxink">
          {sp.nudge === "sent"
            ? "Reminder sent. It's in their inbox and in your messages with them."
            : sp.nudge === "noemail"
              ? "That client has no email yet. Add one on their page, then send again."
              : "That reminder didn't go out. Wait a moment, then try again."}
        </p>
      )}

      {unseenActs.length > 0 && (
        <section id="new-from-clients" className="mt-10 scroll-mt-6" aria-label="New from your clients">
          <h2 className="flex items-center gap-2.5 font-serif font-semibold tracking-tight text-xl">
            <span className="h-[9px] w-[9px] rounded-full bg-lxgold" aria-hidden="true" />
            New from your clients
            <span className="font-sans text-base font-normal text-lxink/55">{unseenActs.length}</span>
          </h2>
          <ul className="mt-2 divide-y divide-lxink/[0.07] border-y border-lxink/[0.07]">
            {[...newByClient].slice(0, 8).map(([id, f]) => (
              <li key={id}>
                <Link href={`/clients/${id}`} className="flex items-center justify-between gap-5 py-4 no-underline hover:opacity-80">
                  <span className="min-w-0 text-lxink">
                    {f.line}.{f.count > 1 && <span className="text-lxink/55"> And {f.count - 1} more.</span>}
                  </span>
                  <span className="shrink-0 rounded-[2px] border border-lxink px-4 py-2 text-[13px] text-lxink">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif font-semibold tracking-tight text-xl">Needs you today</h2>
        {shownNeeds.length === 0 ? (
          <p className="mt-3 text-sm text-lxink/60">You&rsquo;re all caught up. {assistantName} will let you know when something comes in.</p>
        ) : (
          <ul className="mt-2 divide-y divide-lxink/[0.07] border-y border-lxink/[0.07]">
            {shownNeeds.map((n, i) => (
              <li key={n.key} className="flex items-center justify-between gap-5 py-4">
                <Link href={n.href} className="min-w-0 flex-1 no-underline hover:opacity-80">
                  <span className="block font-lux text-[19px] text-lxink">{n.who}</span>
                  <span className="mt-0.5 block truncate text-sm text-lxink/60">{n.line}</span>
                </Link>
                <Link
                  href={n.href}
                  className={`shrink-0 rounded-[2px] px-4 py-2 text-[13px] no-underline ${
                    i === 0 ? "bg-lxink text-lxbg hover:opacity-90" : "border border-lxink text-lxink hover:bg-lxink/[0.04]"
                  }`}
                >
                  {n.act}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {needs.length > shownNeeds.length && <p className="mt-3 text-sm text-lxink/50">And {needs.length - shownNeeds.length} more.</p>}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif font-semibold tracking-tight text-xl">Upcoming</h2>
          <Link href="/calendar" className="text-sm text-lxink/60 no-underline hover:text-lxink">Calendar &rarr;</Link>
        </div>
        {upcomingRows.length === 0 ? (
          <p className="mt-3 text-sm text-lxink/60">Nothing on your calendar yet. Share your booking link, and new consultations will land here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-lxink/[0.07] border-y border-lxink/[0.07]">
            {upcomingRows.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="flex items-center justify-between gap-4 py-3.5 no-underline hover:opacity-80">
                  <span className="min-w-0">
                    <span className="block truncate text-lxink">{r.title}</span>
                    <span className="block text-sm text-lxink/55">{r.sub}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm text-lxink/60">{whenLabel(r.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {onboarding && (
        <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div id="setup-card">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif font-semibold tracking-tight text-xl text-lxink">Your setup</h2>
              {setupDocs.length > 0 && <span className="text-sm text-lxink/55">{sentCount} of {setupDocs.length} sent</span>}
            </div>
            <p className="mt-1 text-sm text-lxink/60">
              {setupDocs.length
                ? "Upload these, and our team will turn them into templates you can send."
                : "Our team is setting up your account. Anything we need from you shows up here."}
            </p>
            {setupDocs.length > 0 && (
              <ul className="mt-3 divide-y divide-lxink/[0.07] border-y border-lxink/[0.07]">
                {setupDocs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p>{d.title}</p>
                      <p className="text-xs text-lxink/55">
                        {!d.file_path ? "Waiting for your file" : d.template_built ? "Your template is ready" : "Received \u00b7 we're building your template"}
                      </p>
                    </div>
                    {d.file_path ? (
                      <span className="flex flex-col items-end gap-1">
                        <span className="text-sm text-lxink/70">Sent</span>
                        {!d.template_built && <SetupUpload docId={d.id} title={d.title} replace />}
                      </span>
                    ) : (
                      <SetupUpload docId={d.id} title={d.title} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm text-lxink/60">Our team, here for your setup</p>
            <SupportThread messages={setupThread} teamName="Our team" compact />
          </div>
        </section>
      )}
    </main>
    </AppShell>
  )
}
