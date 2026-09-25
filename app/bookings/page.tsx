import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatSlot } from "@/lib/slots"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import { addClientFromBooking, deleteBooking } from "@/app/clients/actions"
import RowMenu from "@/app/row-menu"

export const dynamic = "force-dynamic"

type Booking = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  meeting_type: string
  slot_start: string
  looking_to: string | null
  notes: string | null
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; deleted?: string; error?: string }>
}) {
  const params = await searchParams
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
    .select("id, first_name, last_name, email, phone, meeting_type, slot_start, looking_to, notes")
    .order("slot_start", { ascending: true })

  const bookings = (data ?? []) as Booking[]

  // Which of these bookings have already been turned into a client?
  const { data: clientRows } = await supabase
    .from("clients")
    .select("booking_id")
    .not("booking_id", "is", null)
  const addedIds = new Set((clientRows ?? []).map((c) => c.booking_id as string))

  const now = Date.now()

  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-sage">Bookings</p>
      <h1 className="mt-2 font-serif text-3xl">Your consultations</h1>

      {params.added === "1" && (
        <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
          Added to your clients.
        </p>
      )}
      {params.added === "exists" && (
        <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
          That person is already one of your clients.
        </p>
      )}
      {params.deleted && (
        <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
          Booking deleted.
        </p>
      )}
      {params.error === "delete" && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t delete that booking. Please try again.
        </p>
      )}
      {(error || params.error === "add") && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {params.error === "add"
            ? "Couldn\u2019t add that client. Please try again."
            : "Couldn\u2019t load bookings. Refresh to try again."}
        </p>
      )}

      {bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-10 text-center">
          <h2 className="font-serif text-xl">No bookings yet.</h2>
          <p className="mt-2 text-ink/60">
            Share your booking link and new consultations will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-ink/10 bg-white/50">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-ink/50">
              <tr>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Looking to</th>
                <th className="px-5 py-3 font-medium">Notes</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const past = new Date(b.slot_start).getTime() < now
                const isClient = addedIds.has(b.id)
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
                    <td className="px-5 py-4">{b.meeting_type === "phone" ? "Phone" : "Video"}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{b.looking_to || "\u2014"}</td>
                    <td className="min-w-[14rem] max-w-sm px-5 py-4 whitespace-pre-line">{b.notes || "\u2014"}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                      {isClient ? (
                        <span className="inline-flex items-center rounded-full bg-sage/10 px-3 py-1 text-xs font-medium text-sage">
                          Client
                        </span>
                      ) : (
                        <form action={addClientFromBooking}>
                          <input type="hidden" name="bookingId" value={b.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper"
                          >
                            Add as client
                          </button>
                        </form>
                      )}
                      <RowMenu
                        action={deleteBooking}
                        id={b.id}
                        label={`${b.first_name} ${b.last_name}`.trim() || "booking"}
                        confirmText={
                          isClient
                            ? "Delete this booking? Their client record stays. This can't be undone."
                            : "Delete this booking? This can't be undone."
                        }
                      />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </AppShell>
  )
}
