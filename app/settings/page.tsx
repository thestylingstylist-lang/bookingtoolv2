import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import SettingsForm from "./settings-form"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()

  const agent = data as AgentRow | null
  if (!agent) redirect("/login")

  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-sage">Settings</p>
      <h1 className="mt-2 font-serif text-3xl">Your booking page</h1>

      <div className="mb-8 mt-6 rounded-2xl border border-ink/10 bg-white/50 p-5">
        <p className="text-sm text-ink/60">Your booking link — share this with clients:</p>
        <BookingLink slug={agent.slug} />
      </div>

      <SettingsForm agent={agent} />
    </main>
    </AppShell>
  )
}
