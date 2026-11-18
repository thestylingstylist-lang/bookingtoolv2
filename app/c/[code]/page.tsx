import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { agentByShortCode } from "@/lib/short-link"
import { getAgentBySlug } from "@/lib/agent"
import BookPage from "@/app/book/[slug]/page"

export const dynamic = "force-dynamic"

// The short link to a card. Opens the same card as /book/[slug] (with the
// claim built in for a gift card) and carries its own preview picture.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const a = await agentByShortCode(code)
  const agent = a ? await getAgentBySlug(a.slug) : null
  if (!a || !agent) return { title: "Card not found", robots: { index: false } }
  const name = agent.full_name || agent.business_name || "Your card"
  const first = name.split(/\s+/)[0]
  const title = a.claim_token ? `${first}, your card is ready` : name
  const description = agent.tagline?.replace(/\|/g, " ") || "Real estate agent"
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, url: `/c/${code}` },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function ShortCard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const a = await agentByShortCode(code)
  if (!a) notFound()
  return (
    <BookPage
      params={Promise.resolve({ slug: a.slug })}
      searchParams={Promise.resolve(a.claim_token ? { claim: a.claim_token } : {})}
    />
  )
}
