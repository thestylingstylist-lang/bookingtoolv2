import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { releaseHeld } from "@/lib/notify"
import { closeExpired } from "@/lib/meetings"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, esc } from "@/lib/letter"

// Runs every hour (a scheduled job in the GitHub repo calls it).
// 1. Sends each agent's morning note once her day has started.
// 2. Safety net: a client message still unread after a day gets one email.
// 3. Meeting invitations: passed times are released; after 48 hours, or once
//    every time has passed, all holds are released and the agent hears.

export const dynamic = "force-dynamic"

function allowed(request: NextRequest) {
  const got = request.headers.get("authorization")
  return [process.env.NOTIFY_CRON_SECRET, process.env.CRON_SECRET].some((s) => s && got === `Bearer ${s}`)
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()

  let morning = 0
  try {
    morning = await releaseHeld(admin)
  } catch (e) {
    console.error("[notify cron] morning note", e)
  }

  let meetings = 0
  try {
    meetings = await closeExpired(admin)
  } catch (e) {
    console.error("[notify cron] meetings", e)
  }

  let emailed = 0
  try {
    emailed = await unreadSafetyNet(admin)
  } catch (e) {
    console.error("[notify cron] safety net", e)
  }

  return NextResponse.json({ ok: true, morning, emailed, meetings })
}

type Msg = { id: string; agent_id: string; client_id: string; body: string | null; created_at: string; document_id: string | null }

async function unreadSafetyNet(admin: ReturnType<typeof createAdminClient>) {
  const now = Date.now()
  const { data, error } = await admin
    .from("messages")
    .select("id, agent_id, client_id, body, created_at, document_id")
    .eq("sender", "client")
    .is("unread_emailed_at", null)
    .lt("created_at", new Date(now - 24 * 3600_000).toISOString())
    .gt("created_at", new Date(now - 48 * 3600_000).toISOString())
    .limit(500)
  if (error || !data?.length) return 0

  // Only real messages: not "Signed the…" notes or uploads.
  const msgs = (data as Msg[]).filter((m) => m.body && !m.document_id && !/^Signed the /.test(m.body))
  const clientIds = [...new Set(msgs.map((m) => m.client_id))]
  if (!clientIds.length) return 0
  const { data: clients } = await admin.from("clients").select("id, first_name, last_name, agent_read_at").in("id", clientIds)
  const byId = new Map((clients ?? []).map((c) => [c.id as string, c]))

  let sent = 0
  for (const clientId of clientIds) {
    const c = byId.get(clientId)
    const mine = msgs.filter((m) => m.client_id === clientId)
    const readAt = c?.agent_read_at ? new Date(c.agent_read_at as string).getTime() : 0
    const unread = mine.filter((m) => new Date(m.created_at).getTime() > readAt)
    // Mark them all, read or not, so nobody is emailed twice.
    await admin.from("messages").update({ unread_emailed_at: new Date().toISOString() }).in("id", mine.map((m) => m.id))
    if (!unread.length) continue

    const agentId = unread[0].agent_id
    const { data: u } = await admin.auth.admin.getUserById(agentId)
    const to = u?.user?.email
    if (!to) continue
    const first = ((c?.first_name as string) || (c?.last_name as string) || "Your client").trim()
    const last = unread[unread.length - 1].body!.replace(/\s+/g, " ")
    const quote = last.length > 160 ? `${last.slice(0, 158).trimEnd()}…` : last
    const link = `https://www.marvberry.com/clients/${clientId}`
    const ok = await sendEmail({
      to,
      subject: `${first} is waiting on a reply`,
      fromName: "Marvberry",
      html: teamNote(
        `${esc(first)} is waiting on a reply.`,
        para(`${esc(first)} wrote to you yesterday, and it&rsquo;s still unread:`) +
          para(`&ldquo;${esc(quote)}&rdquo;`) +
          button(link, `Open ${esc(first)}&rsquo;s chat`),
      ),
      text: `${first} wrote to you yesterday, and it's still unread:\n\n"${quote}"\n\nOpen ${first}'s chat: ${link}`,
    })
    if (ok) sent++
  }
  return sent
}
