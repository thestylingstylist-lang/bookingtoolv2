import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug, findSlugRedirect } from "@/lib/agent"
import { claimTokenOf, isSuspended } from "@/lib/claim"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { busyRanges } from "@/lib/events"
import CardFlow from "./card-flow"

export const dynamic = "force-dynamic"


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) return { title: "Booking page not found", robots: { index: false } }
  if (await claimTokenOf(agent.id)) return { title: "Your Marvberry Card", robots: { index: false } }
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
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ claim?: string }>
}) {
  const { slug } = await params
  const { claim } = await searchParams
  const agent = await getAgentBySlug(slug)
  if (!agent) {
    // An old link (e.g. before a rename) forwards to the agent's current page.
    const current = await findSlugRedirect(slug)
    if (current) permanentRedirect(`/book/${current}`)
    notFound()
  }
  // A gift card is private until it's claimed: only its claim link opens it.
  const token = await claimTokenOf(agent.id)
  if (token && claim !== token) notFound()
  if (await isSuspended(agent.id)) notFound()

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
  const x = await cardExtras(agent.id)

  return (
    <CardFlow
      slug={agent.slug}
      name={name}
      initials={initials}
      title={["Real estate agent", agent.business_name && agent.business_name !== name ? agent.business_name : ""].filter(Boolean).join(" · ")}
      tagline={agent.tagline}
      photo={agent.headshot_url}
      phone={agent.show_contact ? agent.public_phone : ""}
      email={agent.show_contact ? agent.public_email : ""}
      address={x.address}
      areas={x.areas}
      badge={x.badge}
      guideTitle={x.guideTitle}
      guideBlurb={x.guideBlurb}
      license={license}
      showMade={agent.subscription_status !== "active"}
      minutes={agent.slot_minutes}
      timezone={agent.timezone}
      slots={slots}
      website={x.website}
      instagram={x.instagram}
      claimToken={token}
    />
  )
}

// The reply badge is earned: it shows only once the agent has answered a few
// card requests, and says how fast they usually do.
type Extras = { badge: string; guideTitle: string; guideBlurb: string; areas: string; address: string; website: string; instagram: string }

async function cardExtras(agentId: string): Promise<Extras> {
  const x: Extras = { badge: "", guideTitle: "", guideBlurb: "", areas: "", address: "", website: "", instagram: "" }
  try {
    const admin = createAdminClient()
    const [{ data: g }, { data: g2 }, { data: rows }] = await Promise.all([
      admin.from("agents").select("guide_title, guide_url").eq("id", agentId).maybeSingle(),
      admin.from("agents").select("guide_path, guide_blurb, service_areas, office_address").eq("id", agentId).maybeSingle(),
      admin
        .from("card_requests")
        .select("created_at, replied_at")
        .eq("agent_id", agentId)
        .not("replied_at", "is", null)
        .gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString())
        .limit(200),
    ])
    if (g?.guide_url || g2?.guide_path) x.guideTitle = ((g?.guide_title as string) || "").trim() || "The New Buyer Guide"
    x.guideBlurb = ((g2?.guide_blurb as string) || "").trim()
    x.areas = ((g2?.service_areas as string) || "").trim()
    x.address = ((g2?.office_address as string) || "").trim()
    try {
      const { data: l } = await admin.from("agents").select("website_url, instagram").eq("id", agentId).maybeSingle()
      x.website = ((l?.website_url as string) || "").trim()
      x.instagram = ((l?.instagram as string) || "").trim().replace(/^@/, "")
    } catch {}
    const mins = (rows ?? [])
      .map((r) => (Date.parse(r.replied_at as string) - Date.parse(r.created_at as string)) / 60000)
      .filter((m) => m >= 0)
      .sort((a, b) => a - b)
    if (mins.length >= 3) x.badge = replyBadge(mins[Math.floor(mins.length / 2)])
  } catch {}
  return x
}

function replyBadge(m: number): string {
  if (m <= 15) return "Usually replies within 15 minutes"
  if (m <= 30) return "Usually replies within 30 minutes"
  if (m <= 60) return "Usually replies within the hour"
  if (m <= 180) return "Usually replies within a few hours"
  if (m <= 1440) return "Usually replies the same day"
  return ""
}
