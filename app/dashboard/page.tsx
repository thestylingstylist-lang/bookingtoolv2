import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatSlot } from "@/lib/slots"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { SETUP_STEPS, setupProgress } from "@/lib/onboarding"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"
import { isAdminEmail } from "@/lib/admin"
import { agentDueLabel, daysUntil, isClose, nudgeDraft, missingThing, canNudge, clientDueLabel } from "@/lib/due"
import { toOwner } from "@/lib/phases"
import { sendNudge, skipNudge } from "./nudge-actions"
import { formatInTimeZone } from "date-fns-tz"
import { cookies } from "next/headers"
import { whatsNew } from "@/lib/whats-new"
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
  return `${first}'s ${thing} ${plural ? "are" : "is"} outstanding.`
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ nudge?: string }> }) {
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

  const nowISO = new Date().toISOString()
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, first_name, last_name, meeting_type, slot_start")
    .gte("slot_start", nowISO)
    .order("slot_start", { ascending: true })
    .limit(3)
  const next = upcoming ?? []
  // Bookings already turned into clients open that client; the rest open Bookings, where they become one.
  const { data: madeClients } = await supabase.from("clients").select("id, booking_id").not("booking_id", "is", null)
  const clientFor = new Map((madeClients ?? []).map((c) => [c.booking_id as string, c.id as string]))

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
    .select("id, title, owner, phase, due_on, nudged_at, client_id, clients(first_name, last_name, email, portal_token)")
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
      sub: act ? `I've drafted a message for ${first}. Give it a read, approve it, and hit send.` : when,
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
  const news = await whatsNew(supabase, new Date(since).toISOString(), tz)

  // Onboarding with the Marvberry team: the "Your setup" card and the chat with
  // their owner. Gone once the team marks onboarding complete.
  const admin = createAdminClient()
  const { data: ob } = await admin
    .from("onboarding")
    .select("owner, completed_at")
    .eq("agent_id", user.id)
    .maybeSingle()
  const onboarding = ob && !ob.completed_at ? { owner: (ob.owner as string) || "Alecia" } : null
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

  const signals = { agent, bookingCount: count ?? 0 }
  const { complete, done, total } = setupProgress(SETUP_STEPS, signals)

  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
      <h1 className="font-[Georgia,serif] tracking-tight text-3xl sm:text-4xl">
        {greeting}{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2 text-ink/60">
        {priorities.length ? "Here's what's important today. I'll help you get it handled." : "Nothing pressing today. Everything is on track."}
      </p>

      <SeenMarker since={since} />

      {onboarding && (
        <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border-[1.5px] border-[#C9A24A]/70 bg-card p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-[Georgia,serif] text-xl text-ink">Your setup</h2>
              {setupDocs.length > 0 && <span className="text-sm text-ink/55">{sentCount} of {setupDocs.length} sent</span>}
            </div>
            <p className="mt-1 text-sm text-ink/60">
              {setupDocs.length
                ? `Upload these and ${onboarding.owner} turns them into ready-to-use templates for you.`
                : `${onboarding.owner} is setting up your account. Anything we need from you shows up here.`}
            </p>
            {setupDocs.length > 0 && (
              <>
                <div className="mt-4 h-1.5 rounded-full bg-ink/[0.07]">
                  <div className="h-1.5 rounded-full bg-[#C9A24A]" style={{ width: `${(sentCount / setupDocs.length) * 100}%` }} />
                </div>
                <ul className="mt-3 divide-y divide-ink/[0.07]">
                  {setupDocs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-ink/55">
                          {!d.file_path ? "Waiting for your file" : d.template_built ? "Your template is ready" : "Received · we're building your template"}
                        </p>
                      </div>
                      {d.file_path ? (
                        <span className="flex flex-col items-end gap-1">
                          <span className="text-sm font-medium text-[#1f5b33]">✓ Sent</span>
                          {!d.template_built && <SetupUpload docId={d.id} title={d.title} replace />}
                        </span>
                      ) : (
                        <SetupUpload docId={d.id} title={d.title} />
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A24A] text-xs font-semibold text-white">
                {onboarding.owner.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">{onboarding.owner}</p>
                <p className="text-xs text-ink/55">Your onboarding owner</p>
              </div>
            </div>
            <SupportThread messages={setupThread} teamName={onboarding.owner} compact />
          </div>
        </section>
      )}

      {news.items.length > 0 && (
        <section className="mt-7 max-w-2xl rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
          <p className="font-[Georgia,serif] text-lg leading-snug text-ink">{news.headline}</p>
          <ul className="mt-4 space-y-2.5">
            {news.items.map((n, i) => (
              <li
                key={n.key}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                  i === 0 ? "bg-ink text-paper" : "bg-ink/[0.04] text-ink"
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? "text-[#EE7C55]" : "text-ink/45"}`}>{n.kind}</p>
                  <p className="mt-0.5 font-medium">{n.line}</p>
                  <p className={`text-sm ${i === 0 ? "text-paper/70" : "text-ink/55"}`}>{n.sub}</p>
                </div>
                <Link
                  href={n.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    i === 0 ? "bg-paper text-ink" : "border border-ink/15 text-ink"
                  }`}
                >
                  {n.cta}
                </Link>
              </li>
            ))}
          </ul>
          {news.more > 0 && <p className="mt-3 text-sm text-ink/50">And {news.more} more.</p>}
        </section>
      )}

      {priorities.length > 0 && (
        <section className="mt-7 max-w-2xl">
          <ol className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-card">
            {priorities.map((p, i) => (
              <li key={p.key} className="flex items-start gap-4 p-5">
                <span className={`font-[Georgia,serif] text-xl leading-6 ${i === 0 ? "text-[#D9467A]" : "text-ink/40"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.line}</p>
                  {p.action ? (
                    <>
                      <p className="mt-1 text-sm text-ink/60">{p.sub}</p>
                      <p className={`mt-1 text-xs ${p.urgent ? "text-[#D9467A]" : "text-ink/50"}`}>{p.open}</p>
                      <Link href={p.href} className="mt-3 inline-block rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:opacity-90">
                        {p.action}
                      </Link>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink/60">
                      <span className={p.urgent ? "text-[#D9467A]" : ""}>{p.sub}</span> ·{" "}
                      <Link href={p.href} className="text-ink underline underline-offset-4">{p.open}</Link>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink/50">
            {more ? "There's a little more below." : "Everything else is on track."}{" "}
            <a href="#coming-up" className="text-ink underline underline-offset-4">See the week</a>
          </p>
        </section>
      )}

      <div className="mt-5"><BookingLink slug={agent.slug} compact /></div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-card p-5">
          <p className="font-serif font-semibold tracking-tight text-4xl text-ox">{clientCount ?? 0}</p>
          <p className="mt-1 text-sm text-ink/60">Active clients</p>
        </div>
        <Link href="/calendar" className="rounded-2xl border border-ink/10 bg-card p-5 transition-colors hover:border-ink/20">
          <p className="font-serif font-semibold tracking-tight text-4xl text-ox">{upcomingCount}</p>
          <p className="mt-1 text-sm text-ink/60">Upcoming consultations</p>
        </Link>
      </div>

      {!complete && (
        <Link
          href="/start-here"
          className="mt-6 flex items-center justify-between rounded-2xl border border-sage/30 bg-sage/5 p-5 hover:bg-sage/10"
        >
          <div>
            <p className="font-medium">Finish setting up your page</p>
            <p className="mt-0.5 text-sm text-ink/60">
              {done} of {total} steps done
            </p>
          </div>
          <span className="text-sm text-sage">Start here &rarr;</span>
        </Link>
      )}

      {sp.nudge && (
        <p className={`mt-6 rounded-lg px-4 py-2.5 text-sm ${sp.nudge === "sent" ? "bg-[#e5f1f0] text-sage" : "bg-[#f1f0ee] text-ink"}`}>
          {sp.nudge === "sent"
            ? "Sent. It's in their inbox and their thread."
            : sp.nudge === "noemail"
              ? "That client has no email on file yet."
              : "That one didn't go through. Try again in a moment."}
        </p>
      )}

      {ready.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif font-semibold tracking-tight text-xl">Ready to send</h2>
          <p className="mt-1 text-sm text-ink/60">Client reminders, written in your voice. Nothing goes out until you send it.</p>
          <ul className="mt-3 space-y-3">
            {ready.map((d) => {
              const first = d.clients?.first_name?.trim() || ""
              const thing = missingThing(d.title)
              return (
                <li key={d.id} className="rounded-2xl border border-ink/10 bg-card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/clients/${d.client_id}`} className="font-medium hover:underline">
                      {clientName(d)}
                    </Link>
                    <span className={`text-sm ${isClose(d.due_on, tz) ? "font-medium text-ink" : "text-ink/60"}`}>
                      {clientDueLabel(d.due_on, tz)}
                    </span>
                  </div>
                  {d.clients?.email ? (
                    <form action={sendNudge} className="mt-3 space-y-3">
                      <input type="hidden" name="stepId" value={d.id} />
                      <label className="sr-only" htmlFor={`nudge-${d.id}`}>Reminder to {clientName(d)}</label>
                      <textarea
                        id={`nudge-${d.id}`}
                        name="body"
                        rows={4}
                        defaultValue={nudgeDraft({ clientFirst: first, thing, due: d.due_on, tz, agentFirst: agentFirstName, missingDocs: missingByClient.get(d.client_id) ?? 0, phase: d.phase })}
                        className="w-full resize-y rounded-xl border border-ink/10 bg-[#f7f6f4] px-4 py-3 text-sm leading-relaxed outline-none focus:border-ink/30"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:opacity-90">
                          Send{agentFirstName ? ` as ${agentFirstName}` : ""}
                        </button>
                        <button
                          type="submit"
                          formAction={skipNudge}
                          className="rounded-[10px] border border-ink/10 px-4 py-2.5 text-sm hover:bg-ink/5"
                        >
                          Skip
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form action={skipNudge} className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink/60">
                      <input type="hidden" name="stepId" value={d.id} />
                      <span>
                        Still missing {thing}.{" "}
                        <Link href={`/clients/${d.client_id}`} className="text-ink underline">
                          Add an email for {first || "them"}
                        </Link>{" "}
                        to send a reminder.
                      </span>
                      <button type="submit" className="rounded-[10px] border border-ink/10 px-3 py-1.5 hover:bg-ink/5">
                        Skip
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {[["Past due", pastDue], ["Coming up", comingUp]].map(([label, list]) => (list as DueStep[]).length > 0 && (
        <section key={label as string} id={label === "Coming up" ? "coming-up" : "past-due"} className="mt-6 scroll-mt-24">
          <h2 className="font-serif font-semibold tracking-tight text-xl">{label as string}</h2>
          <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-card">
            {(list as DueStep[]).map((d) => (
              <li key={d.id}>
                <Link href={`/clients/${d.client_id}?step=${d.id}#step-${d.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-ink/[0.02]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-ink/60">
                      {clientName(d)}
                      {toOwner(d.owner) === "client" ? ` · their step` : ""}
                    </p>
                  </div>
                  <span className={`whitespace-nowrap text-sm ${isClose(d.due_on, tz) ? "font-medium text-ink" : "text-ink/60"}`}>
                    {agentDueLabel(d.due_on, tz)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-semibold tracking-tight text-xl">Upcoming</h2>
          <Link href="/bookings" className="text-sm text-ink/60 hover:text-ink">
            All bookings &rarr;
          </Link>
        </div>

        {next.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-ink/10 bg-card p-8 text-center text-ink/60">
            Nothing scheduled yet. Share your link and bookings will show up here.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {next.map((b) => (
              <li key={b.id}>
                <Link
                  href={clientFor.get(b.id) ? `/clients/${clientFor.get(b.id)}` : "/bookings"}
                  className="flex items-center justify-between rounded-xl border border-ink/10 bg-card px-5 py-4 transition-colors hover:border-ink/25"
                >
                  <div>
                    <p className="font-medium">
                      {b.first_name} {b.last_name}
                    </p>
                    <p className="text-sm text-ink/50">{b.meeting_type === "phone" ? "Phone" : "Video"}</p>
                  </div>
                  <p className="text-sm text-ink/60 whitespace-nowrap">
                    {formatSlot(b.slot_start, agent.timezone)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
    </AppShell>
  )
}
