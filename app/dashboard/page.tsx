import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatSlot } from "@/lib/slots"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { SETUP_STEPS, setupProgress } from "@/lib/onboarding"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

export default async function HomePage() {
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

  const signals = { agent, bookingCount: count ?? 0 }
  const { complete, done, total } = setupProgress(SETUP_STEPS, signals)

  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
      <h1 className="font-serif font-semibold tracking-tight text-3xl sm:text-4xl">
        {greeting}{firstName ? `, ${firstName}` : ""}.
      </h1>
      <p className="mt-2 text-ink/60">This is your agenda for today.</p>

      <div className="mt-5"><BookingLink slug={agent.slug} compact /></div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-card p-5">
          <p className="font-serif font-semibold tracking-tight text-4xl text-ox">{clientCount ?? 0}</p>
          <p className="mt-1 text-sm text-ink/60">Active clients</p>
        </div>
        <Link href="/bookings" className="rounded-2xl border border-ink/10 bg-card p-5 transition-colors hover:border-ink/20">
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
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-ink/10 bg-card px-5 py-4"
              >
                <div>
                  <p className="font-medium">
                    {b.first_name} {b.last_name}
                  </p>
                  <p className="text-sm capitalize text-ink/50">{b.meeting_type}</p>
                </div>
                <p className="text-sm text-ink/60 whitespace-nowrap">
                  {formatSlot(b.slot_start, agent.timezone)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
    </AppShell>
  )
}
