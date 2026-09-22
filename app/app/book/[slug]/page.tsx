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
      <header className="mb-12 border-b border-ink/10 pb-10 text-center">
        {agent.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.logo_url}
            alt={agent.business_name || "Logo"}
            className="mx-auto mb-8 h-12 w-auto object-contain sm:h-14"
          />
        )}

        <div className="flex flex-col items-center gap-3">
          {agent.headshot_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.headshot_url}
              alt={agent.full_name || "Agent"}
              className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-1 ring-ink/10 sm:h-28 sm:w-28"
            />
          )}
          <div>
            <p className="text-sm font-medium tracking-wide text-sage">
              {agent.business_name || "Private consultation"}
            </p>
            {agent.tagline && (
              <p className="mt-1 text-sm text-ink/50">{agent.tagline}</p>
            )}
          </div>
        </div>

        <h1 className="mt-8 font-serif text-3xl leading-tight sm:text-4xl">
          Let&rsquo;s find the right time to talk.
        </h1>

        <p className="mx-auto mt-4 max-w-prose whitespace-pre-line text-base leading-relaxed text-ink/70">
          {agent.welcome_message ||
            `Tell ${who} how to reach you and pick a slot that works. It takes under a minute, and you\u2019ll get a confirmation on the spot.`}
        </p>
      </header>

      <BookingForm slots={slots} slug={agent.slug} />

      <footer className="mt-16 space-y-2 text-xs text-ink/40">
        {(agent.public_phone || agent.public_email) && (
          <p className="text-ink/60">
            Questions before booking?{" "}
            {agent.public_phone && <span>Call {agent.public_phone}</span>}
            {agent.public_phone && agent.public_email && <span> &middot; </span>}
            {agent.public_email && (
              <a href={`mailto:${agent.public_email}`} className="underline underline-offset-2">
                {agent.public_email}
              </a>
            )}
          </p>
        )}
        <p>Your details are only used to schedule and prepare for your consultation.</p>
      </footer>
    </main>
  )
}
