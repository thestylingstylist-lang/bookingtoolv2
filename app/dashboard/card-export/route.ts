import { createClient } from "@/lib/supabase/server"

// Everyone who booked or asked from the card, as a spreadsheet the agent keeps.
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Please sign in.", { status: 401 })
  const [{ data: reqs }, { data: books }] = await Promise.all([
    supabase.from("card_requests").select("created_at, name, email, phone, message, wants_guide, replied_at").eq("agent_id", user.id).order("created_at", { ascending: false }),
    supabase.from("bookings").select("created_at, first_name, last_name, email, phone, slot_start").eq("agent_id", user.id).order("created_at", { ascending: false }),
  ])
  const rows = [
    ["Date", "Name", "Email", "Phone", "How", "Message", "Answered"],
    ...(reqs ?? []).map((r) => [String(r.created_at).slice(0, 10), r.name, r.email, r.phone, r.wants_guide ? "Got the guide" : "Asked to be contacted", r.message, r.replied_at ? "Yes" : "No"]),
    ...(books ?? []).map((b) => [String(b.created_at).slice(0, 10), `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim(), b.email, b.phone, `Booked a call for ${String(b.slot_start).slice(0, 10)}`, "", ""]),
  ]
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="my-card-contacts.csv"' },
  })
}
