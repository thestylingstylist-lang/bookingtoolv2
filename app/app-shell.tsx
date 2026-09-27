"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "@/app/login/actions"
import { type AgentRow } from "@/lib/agent"
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import SidebarNav from "./sidebar-nav"

const KEY = "mb-menu-open"
const HELP_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
const OX = "bg-[#5c0a17]"

export default function AppShell({
  agent,
  children,
}: {
  agent: AgentRow
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true) // desktop: expanded or collapsed
  const [mobileOpen, setMobileOpen] = useState(false) // phone: drawer
  const pathname = usePathname()

  // Remember the desktop choice between pages
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "0") setOpen(false)
    } catch {}
  }, [])

  // Close the phone drawer whenever the page changes
  useEffect(() => setMobileOpen(false), [pathname])

  // Stop the page scrolling behind the open drawer
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1")
      } catch {}
      return !v
    })
  }

  const businessName = agent.business_name || "Your business"

  // Full (expanded) menu contents — used by the desktop rail and the phone drawer
  function FullMenu() {
    return (
      <>
        <div className="px-3">
          <p className="font-serif text-lg leading-tight">{businessName}</p>
          <p className="mt-0.5 text-xs text-white/40">{agent.full_name}</p>
        </div>

        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>

        {SUPPORT_EMAIL && (
          <a
            href={HELP_HREF}
            className="mb-5 flex items-center gap-3 rounded-full bg-white/20 p-1.5 pr-5 transition-colors hover:bg-white/30"
          >
            <img src="/support-avatar.jpg" alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            <span className="font-serif text-lg italic text-white">Need Help?</span>
          </a>
        )}

        <a href="/billing" className="mb-2 block px-3 text-xs text-white/40 underline underline-offset-2 hover:text-white/80">
          Billing
        </a>
        <form action={signOut} className="px-3">
          <button className="text-xs text-white/40 underline underline-offset-2 hover:text-white/80">
            Sign out
          </button>
        </form>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* ── Phone top bar: menu on the left, name/logo on the right ── */}
      <header
        className={`sticky top-0 z-40 flex h-14 items-center justify-between px-3 text-white sm:hidden ${OX}`}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <p className="truncate pl-3 font-serif text-lg">{businessName}</p>
      </header>

      {/* ── Phone drawer: slides in from the left over a dim backdrop ── */}
      <div
        className={
          "fixed inset-0 z-50 sm:hidden " + (mobileOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={
            "absolute inset-0 bg-black/40 transition-opacity duration-200 " +
            (mobileOpen ? "opacity-100" : "opacity-0")
          }
        />
        <aside
          className={
            `absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col px-4 py-6 text-white shadow-2xl transition-transform duration-200 ${OX} ` +
            (mobileOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <FullMenu />
        </aside>
      </div>

      {/* ── Desktop rail (unchanged behavior) ── */}
      <aside
        className={
          `sticky top-0 z-40 hidden h-screen shrink-0 flex-col py-6 text-white transition-[width] duration-200 sm:flex ${OX} ` +
          (open ? "w-56 px-4" : "w-16 items-center px-2")
        }
      >
        {open ? (
          <FullMenu />
        ) : (
          <>
            <div className="h-9 w-9 rounded-[10px] bg-[#efe0dc]" aria-hidden />
            <div className="mt-8 flex-1">
              <SidebarNav collapsed />
            </div>
            {SUPPORT_EMAIL && (
              <a href={HELP_HREF} title="Need help?" aria-label="Need help?" className="mb-5">
                <img src="/support-avatar.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
              </a>
            )}
          </>
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

      <div className="min-w-0 flex-1">
        <TrialBanner endsAt={agent.trial_ends_at} status={agent.subscription_status} />
        {children}
      </div>
    </div>
  )
}

// Slim bar at the top of every app page counting down the free trial.
function TrialBanner({ endsAt, status }: { endsAt: string | null; status: string | null }) {
  const [days, setDays] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) return
    setDays(Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000))
  }, [endsAt])
  if (days === null) return null
  if (status === "active" || status === "trialing" || status === "past_due") return null
  const text =
    days <= 0
      ? "Your free trial has ended."
      : days === 1
        ? "Last day of your free trial."
        : `${days} days left in your free trial.`
  return (
    <div className="border-b border-[#ede3da] bg-[#f6f0ea] px-6 py-2.5 text-center text-sm text-[#5c0a17]">
      {text}{" "}
      <a href="/billing" className="font-semibold underline underline-offset-2">
        Pick your plan
      </a>
    </div>
  )
}
