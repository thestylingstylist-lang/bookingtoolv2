import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  agent_email: string | null
  agent_name: string | null
  message: string
  created_at: string
}

export default async function AdminFeedbackPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const { data } = await admin
    .from("feedback")
    .select("id, agent_email, agent_name, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  const rows = (data ?? []) as Row[]

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Feedback</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">What agents are <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text font-serif italic text-transparent">telling us</em></h1>
      <p className="mt-1.5 text-sm text-[#16151a]/60">
        {rows.length} {rows.length === 1 ? "note" : "notes"} from agents.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-[#16151a]/10 bg-white p-6 text-sm text-[#16151a]/60">
            No feedback yet.
          </p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-[0_1px_0_rgba(22,21,26,0.04),0_8px_24px_-12px_rgba(217,70,122,0.25)] backdrop-blur-xl">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[#16151a]">
                {r.agent_name || r.agent_email || "Unknown"}
              </p>
              <p className="shrink-0 text-xs text-[#16151a]/45">
                {new Date(r.created_at).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </p>
            </div>
            {r.agent_email && r.agent_name && (
              <p className="text-xs text-[#16151a]/45">{r.agent_email}</p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#16151a]/80">
              {r.message}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
