"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "@/app/login/actions"
import { type AgentRow } from "@/lib/agent"
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import SidebarNav from "./sidebar-nav"

const KEY = "mb-menu-open"
const HELP_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
const OX = "bg-white/25 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/80 shadow-[1px_0_0_rgba(22,21,26,0.06)]"
const GLOW = "radial-gradient(70% 38% at 15% 12%, rgba(232,155,180,1), transparent 70%), radial-gradient(70% 38% at 35% 55%, rgba(217,70,122,.4), transparent 70%), radial-gradient(70% 40% at 20% 90%, rgba(251,201,142,1), transparent 70%)"

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
          <p className="font-serif font-semibold tracking-tight text-lg leading-tight">{businessName}</p>
          <p className="mt-0.5 text-xs text-[#16151a]/45">{agent.full_name}</p>
        </div>

        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>

        {SUPPORT_EMAIL && (
          <a
            href={HELP_HREF}
            className="mb-5 flex items-center gap-3 rounded-full border border-white/90 bg-white/70 p-1.5 pr-5 shadow-sm transition-colors hover:bg-white"
          >
            <img src="/support-avatar.jpg" alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            <span className="text-base font-semibold text-[#16151a]">Need Help?</span>
          </a>
        )}

        <a href="/billing" className="mb-2 block px-3 text-xs text-[#16151a]/45 underline underline-offset-2 hover:text-[#16151a]">
          Billing
        </a>
        <form action={signOut} className="px-3">
          <button className="text-xs text-[#16151a]/45 underline underline-offset-2 hover:text-[#16151a]">
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
        className={`sticky top-0 z-40 flex h-14 items-center justify-between px-3 text-[#16151a] sm:hidden bg-white/75 backdrop-blur-xl border-b border-[#16151a]/5`}
      >
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/5"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <p className="truncate pl-3 font-serif font-semibold tracking-tight text-lg">{businessName}</p>
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
            `absolute left-0 top-0 flex h-full w-72 max-w-[85vw] isolate flex-col overflow-hidden px-4 py-6 text-[#16151a] shadow-2xl transition-transform duration-200 bg-[#f7f6f4] ` +
            (mobileOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#16151a]/50 hover:bg-black/5 hover:text-[#16151a]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-90" style={{ background: GLOW, filter: "blur(24px)" }} />
          <FullMenu />
        </aside>
      </div>

      {/* soft brand wash the frosted rail sits on */}
      <div
        aria-hidden
        className={"pointer-events-none fixed inset-y-0 left-0 z-0 hidden transition-[width] duration-200 sm:block " + (open ? "w-60" : "w-20")}
        style={{ background: GLOW, filter: "blur(24px)" }}
      />
      {/* ── Desktop rail (unchanged behavior) ── */}
      <aside
        className={
          `sticky top-0 z-40 hidden h-screen shrink-0 flex-col py-6 text-[#16151a] transition-[width] duration-200 sm:flex ${OX} ` +
          (open ? "w-56 px-4" : "w-16 items-center px-2")
        }
      >
        {open ? (
          <FullMenu />
        ) : (
          <>
            <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-[#E89BB4] to-[#FBC98E]" aria-hidden />
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
            "mt-5 flex h-8 w-8 items-center justify-center rounded-full text-[#16151a]/40 transition-colors hover:bg-white/70 hover:text-[#16151a] " +
            (open ? "ml-2" : "")
          }
        >
          <span className="text-base leading-none">{open ? "\u2039" : "\u203a"}</span>
        </button>
      </aside>

      <div className="relative z-10 min-w-0 flex-1">
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
    <div className="border-b border-[#e6e5e3] bg-[#f4f3f1] px-6 py-2.5 text-center text-sm text-[#16151a]">
      {text}{" "}
      <a href="/billing" className="font-semibold underline underline-offset-2">
        Pick your plan
      </a>
    </div>
  )
}
