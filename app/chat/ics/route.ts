import { consultationEvent, icsFile } from "@/lib/calendar"
import { CHAT_CFG, CHAT_HOST, CHAT_EVENT_TITLE } from "../config"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const start = url.searchParams.get("start") ?? ""
  const type = url.searchParams.get("type") === "phone" ? "phone" : "virtual"
  const when = new Date(start)
  if (!start || Number.isNaN(when.getTime())) return new Response("Invalid time", { status: 400 })

  const event = consultationEvent({
    agentName: CHAT_HOST.first,
    startISO: when.toISOString(),
    minutes: CHAT_CFG.slotMinutes,
    meetingType: type,
    agentEmail: CHAT_HOST.email,
  })
  event.title = CHAT_EVENT_TITLE

  return new Response(icsFile(event, `chat-${when.getTime()}`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="marvberry-chat.ics"',
      "Cache-Control": "no-store",
    },
  })
}
