import { getAgentBySlug } from "@/lib/agent"
import { consultationEvent, icsFile } from "@/lib/calendar"

export const dynamic = "force-dynamic"

// GET /book/[slug]/ics?start=<ISO>&type=<virtual|phone>
// Serves an .ics file so Apple Calendar (and any other app) can add the booking.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const url = new URL(req.url)
  const start = url.searchParams.get("start") ?? ""
  const type = url.searchParams.get("type") === "phone" ? "phone" : "virtual"

  const when = new Date(start)
  if (!start || Number.isNaN(when.getTime())) return new Response("Invalid time", { status: 400 })

  const agent = await getAgentBySlug(slug)
  if (!agent) return new Response("Not found", { status: 404 })

  const event = consultationEvent({
    agentName: agent.full_name || agent.business_name,
    startISO: when.toISOString(),
    minutes: agent.slot_minutes,
    meetingType: type,
    agentPhone: agent.public_phone,
    agentEmail: agent.public_email,
  })

  return new Response(icsFile(event, `${agent.id}-${when.getTime()}`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="consultation.ics"',
      "Cache-Control": "no-store",
    },
  })
}
