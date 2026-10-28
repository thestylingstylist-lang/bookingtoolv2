import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { REF_COOKIE, REF_DAYS } from "@/lib/partners"

// A partner's link: marvberry.com/r/CODE.
// Counts the click, remembers the partner for 60 days, and sends the visitor to the home page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const res = NextResponse.redirect(new URL("/", req.url))
  const clean = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32)
  if (!clean) return res
  try {
    const admin = createAdminClient()
    const { data: p } = await admin.from("partners").select("id").eq("code", clean).eq("status", "active").maybeSingle()
    if (p?.id) {
      const bot = /bot|crawl|spider|preview|facebookexternalhit/i.test(req.headers.get("user-agent") ?? "")
      if (!bot) await admin.from("partner_clicks").insert({ partner_id: p.id })
      res.cookies.set(REF_COOKIE, clean, { maxAge: REF_DAYS * 86400, path: "/", sameSite: "lax", httpOnly: true, secure: true })
    }
  } catch {}
  return res
}
