"use client"

import { useState } from "react"
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
  const [open, setOpen] = useState(true)

  return (
    <div className="flex min-h-screen">
      <aside
        className={
          "relative hidden shrink-0 flex-col border-r border-ink/10 py-8 transition-[width] duration-200 sm:flex " +
          (open ? "w-60 px-4" : "w-14 px-2")
        }
      >
        {/* Collapse / expand arrow */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse menu" : "Expand menu"}
          className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-ink/15 bg-paper text-ink/50 shadow-sm transition-colors hover:text-ink"
        >
          <span className="text-xs leading-none">{open ? "\u2039" : "\u203a"}</span>
        </button>

        {open ? (
          <>
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
          </>
        ) : (
          <div className="mt-8 flex flex-1 flex-col items-center">
            <div className="h-8 w-8 rounded-lg bg-ink/10" aria-hidden />
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
