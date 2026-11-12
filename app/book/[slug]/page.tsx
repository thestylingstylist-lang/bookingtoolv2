import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug, findSlugRedirect } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { busyRanges } from "@/lib/events"
import BookingForm from "./booking-form"
import Card from "./card"

export const dynamic = "force-dynamic"

// Showcase default. Later each realtor picks their own colors in Settings.
const THEME = {
  "--base": "#f1f0ee",
  "--panel": "#e6e5e3",
  "--photo": "#d6d4d0",
  "--panel-line": "#d4d2ce",
  "--accent": "#16151a",
  "--accent-soft": "#f1f0ee",
} as React.CSSProperties

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) return { title: "Booking page not found", robots: { index: false } }
  const name = agent.full_name || agent.business_name || "your agent"
  const title = `Book a consultation with ${name}`
  const description =
    agent.tagline || `Pick a time that works for you and book a private consultation with ${name}.`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/book/${slug}` },
    openGraph: { title, description, url: `/book/${slug}`, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) {
    // An old link (e.g. before a rename) forwards to the agent's current page.
    const current = await findSlugRedirect(slug)
    if (current) permanentRedirect(`/book/${current}`)
    notFound()
  }

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

  const slots = generateSlots(cfg, takenISO, await busyRanges(createAdminClient(), agent.id))
  const name = agent.full_name || agent.business_name || ""
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
  // Optional. Blank, or not set up yet, means nothing shows.
  let license = ""
  try {
    const { data } = await createAdminClient().from("agents").select("license_number").eq("id", agent.id).maybeSingle()
    license = ((data as { license_number?: string } | null)?.license_number ?? "").trim()
  } catch {}
  const { badge, guideTitle } = await cardExtras(agent.id)

  return (
    <>
      <div
        style={{ ...THEME, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        className="grid min-h-screen bg-[#F4F1EA] text-[#16151a] lg:grid-cols-[480px_minmax(0,1fr)]"
      >
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <Card
            slug={agent.slug}
            name={name}
            initials={initials}
            title={["Real estate agent", agent.business_name && agent.business_name !== name ? agent.business_name : ""].filter(Boolean).join(" · ")}
            line={agent.tagline || "Thinking about buying or selling? Let\u2019s talk."}
            photo={agent.headshot_url}
            phone={agent.show_contact ? agent.public_phone : ""}
            email={agent.show_contact ? agent.public_email : ""}
            badge={badge}
            guideTitle={guideTitle}
            fine={license ? [`License ${license}`] : []}
          />
        </aside>

        <main id="book" className="scroll-mt-4 bg-white px-5 py-10 sm:px-14 sm:py-14 lg:pr-[72px]">
          <div className="mx-auto max-w-[860px]">
            <BookingForm
              slots={slots}
              slug={agent.slug}
              agent={{
                name,
                minutes: agent.slot_minutes,
                phone: agent.public_phone,
                email: agent.public_email,
                timezone: agent.timezone,
              }}
            />
            <p className="mt-14 text-xs text-[#9a989e]">
              Your details are only used to schedule and prepare for your consultation.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

// The reply badge is earned: it shows only once the agent has answered a few
// card requests, and says how fast they usually do.
async function cardExtras(agentId: string): Promise<{ badge: string; guideTitle: string }> {
  let badge = ""
  let guideTitle = ""
  try {
    const admin = createAdminClient()
    const [{ data: g }, { data: rows }] = await Promise.all([
      admin.from("agents").select("guide_title, guide_url").eq("id", agentId).maybeSingle(),
      admin
        .from("card_requests")
        .select("created_at, replied_at")
        .eq("agent_id", agentId)
        .not("replied_at", "is", null)
        .gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString())
        .limit(200),
    ])
    if (g?.guide_url) guideTitle = ((g.guide_title as string) || "").trim() || "Get my free buyer guide"
    const mins = (rows ?? [])
      .map((r) => (Date.parse(r.replied_at as string) - Date.parse(r.created_at as string)) / 60000)
      .filter((m) => m >= 0)
      .sort((a, b) => a - b)
    if (mins.length >= 3) badge = replyBadge(mins[Math.floor(mins.length / 2)])
  } catch {}
  return { badge, guideTitle }
}

function replyBadge(m: number): string {
  if (m <= 15) return "Usually replies within 15 minutes"
  if (m <= 30) return "Usually replies within 30 minutes"
  if (m <= 60) return "Usually replies within the hour"
  if (m <= 180) return "Usually replies within a few hours"
  if (m <= 1440) return "Usually replies the same day"
  return ""
}
