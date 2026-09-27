import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import BookingForm from "./booking-form"

export const dynamic = "force-dynamic"

const SERIF = { fontFamily: "var(--font-geist-sans), -apple-system,'Segoe UI',Helvetica,Arial,sans-serif", letterSpacing: "-0.02em" }

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
  const name = agent.full_name || agent.business_name || ""
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
  const credentials = [agent.tagline, agent.business_name !== name ? agent.business_name : ""].filter(Boolean)

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
        className="grid min-h-screen bg-[var(--base)] text-[#16151a] lg:grid-cols-[500px_minmax(0,1fr)]"
      >
        <aside className="flex flex-col bg-[var(--panel)] p-6 sm:p-10">
          {agent.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.headshot_url}
              alt={name || "Agent"}
              className="h-[340px] w-full rounded-[18px] bg-[var(--photo)] object-cover object-top lg:h-[450px]"
            />
          ) : (
            <div
              style={SERIF}
              className="flex h-[240px] w-full items-center justify-center rounded-[18px] bg-[var(--photo)] text-6xl text-[#5d5b62] lg:h-[450px]"
              aria-hidden
            >
              {initials}
            </div>
          )}

          <div className="flex flex-col gap-[18px] px-2.5 pb-2 pt-7">
            <h1 style={SERIF} className="text-[34px] font-medium leading-[1.05] sm:text-[38px]">
              Thinking about buying <span>or selling?</span>
            </h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#5d5b62]">
              {agent.welcome_message ||
                "Book a free consultation and let\u2019s map out your next move together."}
            </p>
            <div className="h-px bg-[var(--panel-line)]" />
            <div className="flex flex-col gap-2">
              {name && (
                <p style={SERIF} className="text-[30px] leading-none">
                  {name}
                </p>
              )}
              {credentials.length > 0 && (
                <p className="text-xs uppercase leading-[1.8] tracking-[2px] text-[#5d5b62]">
                  {credentials.map((c, i) => (
                    <span key={i} className="block">
                      {c}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="bg-white px-5 py-10 sm:px-14 sm:py-14 lg:pr-[72px]">
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
