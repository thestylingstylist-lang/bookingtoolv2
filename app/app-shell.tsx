"use client"

import { useEffect, useState } from "react"
import { signOut } from "@/app/login/actions"
import { type AgentRow } from "@/lib/agent"
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import SidebarNav from "./sidebar-nav"

const KEY = "mb-menu-open"
const HELP_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`

export default function AppShell({
  agent,
  children,
}: {
  agent: AgentRow
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)

  // Remember the choice between pages
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "0") setOpen(false)
    } catch {}
  }, [])

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1")
      } catch {}
      return !v
    })
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={
          "sticky top-0 z-40 hidden h-screen shrink-0 flex-col bg-[#141210] py-6 text-white transition-[width] duration-200 sm:flex " +
          (open ? "w-56 px-4" : "w-16 items-center px-2")
        }
      >
        {open ? (
          <div className="px-3">
            <p className="font-serif text-lg leading-tight">{agent.business_name || "Your business"}</p>
            <p className="mt-0.5 text-xs text-white/40">{agent.full_name}</p>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-[10px] bg-[#e7d3c7]" aria-hidden />
        )}

        <div className="mt-8 flex-1">
          <SidebarNav collapsed={!open} />
        </div>

        {SUPPORT_EMAIL &&
          (open ? (
            <a
              href={HELP_HREF}
              className="mb-5 flex items-center gap-3 rounded-full bg-white/20 p-1.5 pr-5 transition-colors hover:bg-white/30"
            >
              <img src="/support-avatar.jpg" alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              <span className="font-serif text-lg italic text-white">Need Help?</span>
            </a>
          ) : (
            <a href={HELP_HREF} title="Need help?" aria-label="Need help?" className="mb-5">
              <img src="/support-avatar.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
            </a>
          ))}

        {open && (
          <form action={signOut} className="px-3">
            <button className="text-xs text-white/40 underline underline-offset-2 hover:text-white/80">
              Sign out
            </button>
          </form>
        )}

        <button
          onClick={toggle}
          aria-label={open ? "Collapse menu" : "Expand menu"}
          className={
            "mt-5 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white " +
            (open ? "ml-2" : "")
          }
        >
          <span className="text-base leading-none">{open ? "\u2039" : "\u203a"}</span>
        </button>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
