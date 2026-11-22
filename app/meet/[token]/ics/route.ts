import { createAdminClient } from "@/lib/supabase/admin"
import { loadInvite, kindPhrase, howLine } from "@/lib/meetings"
import { icsFile } from "@/lib/calendar"

// "Add to Apple Calendar" (and anything else that opens .ics files).
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const v = await loadInvite(createAdminClient(), token)
  const chosen = v?.options.find((o) => o.chosen)
  if (!v || v.status !== "booked" || !chosen) return new Response("Not found", { status: 404 })
  const body = icsFile(
    {
      title: `Meeting with ${v.agentName}`,
      details: `${kindPhrase(v.kind, v.place)} with ${v.agentName}. ${howLine(v, v.meetingLink)}`,
      startISO: chosen.startISO,
      minutes: v.minutes,
    },
    `meet-${v.id}`,
  )
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="meeting.ics"` },
  })
}
