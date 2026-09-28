import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { isAdminEmail } from "@/lib/admin"
import AppShell from "@/app/app-shell"
import SupportThread, { type Msg } from "./support-thread"

export const dynamic = "force-dynamic"

export default async function SupportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (isAdminEmail(user.email)) redirect("/admin/messages")

  const { data: agentData } = await supabase.from("agents").select(AGENT_SELECT).eq("id", user.id).maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")

  const admin = createAdminClient()
  const { data } = await admin
    .from("support_messages")
    .select("id, body, from_team, created_at")
    .eq("agent_id", user.id)
    .order("created_at", { ascending: true })
    .limit(500)
  const messages = (data ?? []) as Msg[]

  // Opening the page marks the team's replies as read.
  if (messages.some((m) => m.from_team)) {
    await admin
      .from("support_messages")
      .update({ read_by_agent: true })
      .eq("agent_id", user.id)
      .eq("from_team", true)
  }

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Support</h1>
        <p className="mt-3 text-base font-medium text-[#16151a]">We’re obsessed with customer service.</p>
        <p className="mt-1 text-sm leading-relaxed text-[#16151a]/60">
          We answer Monday through Friday, so if you message us on a weekend or public holiday,
          we’ll get right back to you the next business day.
        </p>
        <SupportThread messages={messages} />
      </main>
    </AppShell>
  )
}
