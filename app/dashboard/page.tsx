import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatSlot } from "@/lib/slots"
import { signOut } from "@/app/login/actions"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import BookingLink from "./booking-link"

export const dynamic = "force-dynamic"

type Booking = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  meeting_type: string
  slot_start: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: agentData } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")

  const { data, error } = await supabase
    .from("bookings")
    .select("id, first_name, last_name, email, phone, meeting_type, slot_start")
    .order("slot_start", { ascending: true })

  const bookings = (data ?? []) as Booking[]
  const now = Date.now()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-sage">
            {agent.business_name || "Dashboard"}
          </p>
          <h1 className="mt-2 font-serif text-3xl">Bookings</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="rounded-lg border border-ink/20 px-4 py-2 text-sm text-ink/70 hover:border-ink/40"
          >
            Settings
          </Link>
          <form action={signOut}>
            <button className="rounded-lg border border-ink/20 px-4 py-2 text-sm text-ink/70 hover:border-ink/40">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-ink/10 bg-white/50 p-5">
        <p className="text-sm text-ink/60">Your booking link — share this with clients:</p>
        <BookingLink slug={agent.slug} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t load bookings. Refresh to try again.
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white/50 p-10 text-center">
          <h2 className="font-serif text-xl">No bookings yet.</h2>
          <p className="mt-2 text-ink/60">
            Share your booking link and new consultations will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white/50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/50">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const past = new Date(b.slot_start).getTime() < now
                return (
                  <tr
                    key={b.id}
                    className={"border-b border-ink/5 last:border-0 " + (past ? "text-ink/40" : "")}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      {formatSlot(b.slot_start, agent.timezone)}
                    </td>
                    <td className="px-5 py-4">
                      {b.first_name} {b.last_name}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        {b.phone && <span>{b.phone}</span>}
                        {b.email && <span className="text-ink/50">{b.email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 capitalize">{b.meeting_type}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
