import { signOut } from "@/app/login/actions"
import { type AgentRow } from "@/lib/agent"
import SidebarNav from "./sidebar-nav"

export default function AppShell({
  agent,
  children,
}: {
  agent: AgentRow
  children: React.ReactNode
}) {
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
