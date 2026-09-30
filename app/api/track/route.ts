import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Visit tracking for the marketing home page. The page sends a snapshot of the
// visit (time, scroll depth, time per section) every so often and when the
// visitor leaves; we keep one row per visit and overwrite it with the latest.
const SECTIONS = ["hero", "statement", "chase", "portal", "signature", "calendar", "bookingpage", "features", "cards", "bento", "pricing", "faq", "final"] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i
const HOUR = 3_600_000

const clampInt = (v: unknown, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0
}
const cut = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null)

export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 })

  let body: Record<string, unknown>
  try {
    body = JSON.parse(await req.text())
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const sid = String(body.sid ?? "")
  if (!UUID.test(sid)) return new NextResponse(null, { status: 400 })

  const sectionMs: Record<string, number> = {}
  const raw = (body.sections ?? {}) as Record<string, unknown>
  for (const s of SECTIONS) if (raw[s] != null) sectionMs[s] = clampInt(raw[s], HOUR)

  const furthest = SECTIONS.includes(body.furthest as (typeof SECTIONS)[number]) ? (body.furthest as string) : null
  const device = ["mobile", "tablet", "desktop"].includes(body.device as string) ? (body.device as string) : null

  const row = {
    session_id: sid,
    path: cut(body.path, 200) ?? "/",
    referrer: cut(body.ref, 300),
    utm_source: cut(body.utm, 100),
    device,
    last_seen: new Date().toISOString(),
    duration_ms: clampInt(body.duration, 4 * HOUR),
    max_scroll: clampInt(body.scroll, 100),
    furthest_section: furthest,
    section_ms: sectionMs,
    signup_click: body.signup === true,
  }

  const { error } = await createAdminClient().from("site_visits").upsert(row, { onConflict: "session_id" })
  if (error) console.error("track:", error.message)
  return new NextResponse(null, { status: 204 })
}
