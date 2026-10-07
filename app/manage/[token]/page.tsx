import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { busyRanges } from "@/lib/events"
import ManageView from "./manage-view"

export const dynamic = "force-dynamic"
export const metadata = { title: "Your booking", robots: { index: false, follow: false } }

const SERIF = { fontFamily: "var(--font-geist-sans), -apple-system,'Segoe UI',Helvetica,Arial,sans-serif", letterSpacing: "-0.02em" }
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const THEME = {
  "--base": "#f1f0ee",
  "--accent": "#16151a",
  "--accent-soft": "#f1f0ee",
} as React.CSSProperties

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  type B = { first_name: string; meeting_type: string; slot_start: string; agent_id: string }
  let booking: B | null = null
  let agent: AgentRow | null = null
  if (uuidRe.test(token)) {
    const { data } = await admin
      .from("bookings")
      .select("first_name, meeting_type, slot_start, agent_id")
      .eq("manage_token", token)
      .maybeSingle()
    if (data) {
      booking = data as B
      const { data: a } = await admin.from("agents").select(AGENT_SELECT).eq("id", data.agent_id).maybeSingle()
      agent = (a as AgentRow) ?? null
    }
  }

  const upcoming = booking && agent && new Date(booking.slot_start).getTime() > Date.now()

  let slots: ReturnType<typeof generateSlots> = []
  if (upcoming && agent) {
    const { data: rows } = await admin.from("bookings").select("slot_start").eq("agent_id", agent.id)
    const taken = new Set((rows ?? []).map((r) => new Date(r.slot_start as string).toISOString()))
    slots = generateSlots(toAgentConfig(agent), taken, await busyRanges(admin, agent.id))
  }

  const agentName = agent ? agent.full_name || agent.business_name || "" : ""

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=DM+Sans:wght@400;500&display=swap"
        precedence="default"
      />
      <div
        style={{ ...THEME, fontFamily: "'DM Sans', system-ui, sans-serif" }}
        className="min-h-screen bg-[var(--base)] px-4 py-10 text-[#16151a] sm:py-16"
      >
        <main className="mx-auto max-w-[760px] rounded-[18px] bg-white px-5 py-10 sm:px-12 sm:py-12">
          {upcoming && booking && agent ? (
            <ManageView
              token={token}
              slots={slots}
              current={booking.slot_start}
              firstName={booking.first_name}
              meetingType={booking.meeting_type}
              agentName={agentName}
              agentTz={agent.timezone}
              minutes={agent.slot_minutes}
              bookUrl={`/book/${agent.slug}`}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <h1 style={SERIF} className="text-[40px] font-medium leading-none">
                This booking isn&rsquo;t active anymore.
              </h1>
              <p className="text-[15px] leading-relaxed text-[#5d5b62]">
                It may have already happened, been cancelled, or moved.
              </p>
              {agent && (
                <a
                  href={`/book/${agent.slug}`}
                  className="mt-2 flex h-12 w-fit items-center rounded-[10px] bg-[#16151a] px-6 text-[15px] font-medium text-white hover:opacity-90"
                >
                  Book a new time
                </a>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
