import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import type { Lead, Touch } from "./stages"
import { giftSummaries } from "@/lib/gift-events"
import Board, { type CardStat, type CardOption } from "./board"

export const dynamic = "force-dynamic"

// Outbound pipeline: every agent texted, from first message to paying member.
export default async function PipelinePage() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const db = createAdminClient()
  const [ld, tc, ag] = await Promise.all([
    db.from("pipeline_leads").select("*").order("created_at", { ascending: false }).limit(1000),
    db.from("pipeline_touches").select("id, lead_id, created_at, note").order("created_at", { ascending: false }).limit(5000),
    db.from("agents").select("id, full_name, slug").not("gifted_at", "is", null).order("full_name"),
  ])
  const leads = (ld.data ?? []) as Lead[]
  const touches = (tc.data ?? []) as Touch[]
  const cards = (ag.data ?? []) as CardOption[]

  // Views and bookings for each linked card.
  const ids = [...new Set(leads.map((l) => l.agent_id).filter(Boolean))] as string[]
  const stats: Record<string, CardStat> = {}
  if (ids.length) {
    const { data: ev } = await db.from("card_events").select("agent_id, kind").in("agent_id", ids).in("kind", ["view", "book"]).limit(20000)
    for (const e of ev ?? []) {
      const s = (stats[e.agent_id] ??= { views: 0, bookings: 0 })
      if (e.kind === "view") s.views++
      else s.bookings++
    }
  }

  const gifts = await giftSummaries(ids)

  return <Board gifts={gifts} leads={leads} touches={touches} cards={cards} stats={stats} missing={!!ld.error} now={Date.now()} />
}
