import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import ManageView from "./manage-view"

export const dynamic = "force-dynamic"

const SERIF = { fontFamily: "'Cormorant Garamond', Georgia, serif" }
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const THEME = {
  "--base": "#f8f3ef",
  "--accent": "#b08477",
  "--accent-soft": "#f2e4dd",
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
    slots = generateSlots(toAgentConfig(agent), taken)
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
        className="min-h-screen bg-[var(--base)] px-4 py-10 text-[#3d3230] sm:py-16"
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
              <p className="text-[15px] leading-relaxed text-[#8a7872]">
                It may have already happened, been cancelled, or moved.
              </p>
              {agent && (
                <a
                  href={`/book/${agent.slug}`}
                  className="mt-2 flex h-12 w-fit items-center rounded-[10px] bg-[#1c1a19] px-6 text-[15px] font-medium text-white hover:opacity-90"
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
