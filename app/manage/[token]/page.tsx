import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { busyRanges } from "@/lib/events"
import "../../suite-fonts"
import ManageView from "./manage-view"
import { AgentHeader, SuiteFooter, BTN } from "../../suite-ui"

export const dynamic = "force-dynamic"
export const metadata = { title: "Your booking", robots: { index: false, follow: false } }

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i


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
    <div className="min-h-screen bg-lxbg px-[26px] pb-6 pt-10 font-luxsans text-lxink antialiased sm:pt-16">
      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-[680px] flex-col">
        {agent && <AgentHeader name={agentName} brokerage={agent.business_name} />}
        <main className="pt-[34px] sm:pt-11">
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
              <h1 className="m-0 font-lux text-[38px] font-light leading-[1.08] sm:text-[44px]">This booking isn&rsquo;t active anymore.</h1>
              <p className="m-0 text-[14px] leading-relaxed text-lxsoft">It may have already happened, been cancelled, or moved.</p>
              {agent && (
                <a href={`/book/${agent.slug}`} className={`${BTN} mt-2 w-fit`}>
                  Book a new time
                </a>
              )}
            </div>
          )}
        </main>
        <div className="mt-auto">
          <SuiteFooter />
        </div>
      </div>
    </div>
  )
}
