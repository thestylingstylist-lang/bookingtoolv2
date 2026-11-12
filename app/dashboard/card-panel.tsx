import QRCode from "qrcode"
import type { SupabaseClient } from "@supabase/supabase-js"
import { siteUrl } from "@/lib/stripe"
import CardPanelView, { type Req } from "./card-panel-view"

// "Your card" on the dashboard: the link and QR code, what the card did this
// month, and everyone who asked to be contacted, until each one is answered.
// Hidden until the card tables exist.
export default async function CardPanel({ supabase, agentId, slug }: { supabase: SupabaseClient; agentId: string; slug: string }) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const [ev, rq, ag] = await Promise.all([
    supabase.from("card_events").select("kind").eq("agent_id", agentId).gte("created_at", since).limit(5000),
    supabase.from("card_requests").select("id, created_at, name, email, phone, message, wants_guide, replied_at, client_id").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(60),
    supabase.from("agents").select("guide_title, guide_url, subscription_status").eq("id", agentId).maybeSingle(),
  ])
  const { data: more } = await supabase.from("agents").select("guide_path, guide_blurb, service_areas, office_address").eq("id", agentId).maybeSingle()
  if (ev.error || rq.error) return null

  const count = (k: string) => (ev.data ?? []).filter((e) => e.kind === k).length
  const reqs = (rq.data ?? []) as Req[]
  const recent = reqs.filter((r) => r.created_at >= since)
  const url = `${siteUrl()}/book/${slug}`
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#16151a", light: "#ffffff" } })

  return (
    <CardPanelView
      url={url}
      qr={qr}
      stats={[
        { k: "Viewed", v: count("view") },
        { k: "Saved", v: count("save") },
        { k: "Shared", v: count("share") },
        { k: "Booked", v: count("book") },
        { k: "Asked", v: count("request") },
      ]}
      answered={recent.filter((r) => r.replied_at).length}
      asked={recent.length}
      waiting={reqs.filter((r) => !r.replied_at)}
      guideTitle={(ag.data?.guide_title as string) || ""}
      hasGuide={!!(more?.guide_path || ag.data?.guide_url)}
      guideBlurb={(more?.guide_blurb as string) || ""}
      areas={(more?.service_areas as string) || ""}
      address={(more?.office_address as string) || ""}
      paid={ag.data?.subscription_status === "active"}
      slug={slug}
    />
  )
}
