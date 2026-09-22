import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/app/login/actions"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import SidebarNav from "./sidebar-nav"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 px-4 py-8 sm:flex">
        <div className="px-3">
          <p className="font-serif text-lg leading-tight">
            {agent.business_name || "Your business"}
          </p>
          <p className="mt-0.5 text-xs text-ink/40">{agent.full_name}</p>
        </div>

        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>

        <form action={signOut} className="px-3">
          <button className="text-xs text-ink/40 underline underline-offset-2 hover:text-ink/70">
            Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
