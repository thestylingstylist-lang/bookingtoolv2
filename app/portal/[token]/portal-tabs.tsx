"use client"

import { useEffect, useRef, useState } from "react"

type Tab = "next" | "documents" | "messages"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "next",
    label: "Next step",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    id: "documents",
    label: "Documents",
    icon: (
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
      </>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    icon: <path d="M4 5h16v11H9l-5 4V5z" />,
  },
]

// Desktop: the same two-column layout as before (left stack + messages).
// Phone/tablet: one section at a time, switched from a bottom tab bar.
export default function PortalTabs({
  next,
  documents,
  messages,
  startTab = "next",
}: {
  next: React.ReactNode
  documents: React.ReactNode
  messages: React.ReactNode
  startTab?: Tab
}) {
  const [tab, setTab] = useState<Tab>(startTab)
  const on = (t: Tab) => tab === t
  const msgRef = useRef<HTMLDivElement>(null)

  // Phone: stretch the Messages card down to just above the bottom bar.
  useEffect(() => {
    const fit = () => {
      const el = msgRef.current
      if (!el) return
      if (window.innerWidth >= 768 || tab !== "messages") {
        el.style.minHeight = ""
        return
      }
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.minHeight = Math.max(320, window.innerHeight - top - 88) + "px"
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [tab])

  // "#messages" (after sending, or the "Message" button) opens the Messages tab.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#messages") setTab("messages")
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href="#messages"]')
      if (a) setTab("messages")
    }
    sync()
    window.addEventListener("hashchange", sync)
    document.addEventListener("click", click)
    return () => {
      window.removeEventListener("hashchange", sync)
      document.removeEventListener("click", click)
    }
  }, [])

  return (
    <>
      <div className="mt-3 grid items-stretch gap-3 pb-20 md:grid-cols-[1fr_1.2fr] md:pb-0">
        <div className="flex flex-col gap-3">
          <div className={on("next") ? "flex flex-col gap-3" : "hidden md:flex md:flex-col md:gap-3"}>
            {next}
          </div>
          <div className={on("documents") ? "" : "hidden md:block"}>{documents}</div>
        </div>
        <div ref={msgRef} className={on("messages") ? "flex flex-col" : "hidden md:flex md:flex-col"}>
          {messages}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-[#e4e3e0] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              window.scrollTo({ top: 0 })
            }}
            className={
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors " +
              (on(t.id) ? "text-[#16151a]" : "text-[#5d5b62]")
            }
            aria-current={on(t.id) ? "page" : undefined}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={on(t.id) ? 2 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
