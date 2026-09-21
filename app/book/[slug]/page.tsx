import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import BookingForm from "./booking-form"

export const dynamic = "force-dynamic"

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) notFound()

  const cfg = toAgentConfig(agent)

  let takenISO = new Set<string>()
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from("bookings")
      .select("slot_start")
      .eq("agent_id", agent.id)
    takenISO = new Set(
      (data ?? []).map((r) => new Date(r.slot_start as string).toISOString())
    )
  } catch {
    // Render anyway; availability is re-checked on submit.
  }

  const slots = generateSlots(cfg, takenISO)
  const who = agent.business_name || agent.full_name || "us"

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16 sm:py-24">
      <header className="mb-12">
        <p className="text-sm font-medium tracking-wide text-sage">
          {agent.business_name || "Private consultation"}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
          Let&rsquo;s find the right time to talk.
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-ink/70">
          Tell {who} how to reach you and pick a slot that works. It takes under a
          minute, and you&rsquo;ll get a confirmation on the spot.
        </p>
      </header>
      <BookingForm slots={slots} slug={agent.slug} />
      <footer className="mt-16 text-xs text-ink/40">
        Your details are only used to schedule and prepare for your consultation.
      </footer>
    </main>
  )
}
