"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

type Tab = "tasks" | "documents" | "messages" | "client"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "tasks",
    label: "Tasks",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
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
  {
    id: "client",
    label: "Client",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
]

// On desktop: the three columns side by side, exactly as before.
// On phone/tablet: one column at a time, switched from a bottom tab bar.
export default function JacketTabs({
  initial,
  tasks,
  documents,
  messages,
  client,
  summary,
  late = 0,
}: {
  summary?: string
  late?: number
  initial?: Tab
  tasks: React.ReactNode
  documents: React.ReactNode
  messages: React.ReactNode
  client: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>(initial ?? "messages")
  // Desktop: steps and documents open as a pop-out, so the conversation has the room.
  const [steps, setSteps] = useState(initial === "tasks")
  // Adding or checking off a step reloads the page; keep the panel open through it.
  const KEY = "marvberry-steps-open"
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === window.location.pathname) setSteps(true)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      if (steps) sessionStorage.setItem(KEY, window.location.pathname)
      else sessionStorage.removeItem(KEY)
    } catch {}
  }, [steps])
  useEffect(() => {
    if (!steps) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSteps(false)
    window.addEventListener("keydown", onKey)
    // Hold the page still while the panel is open, so the wheel scrolls the panel.
    const prev = document.body.style.overflow
    if (window.innerWidth >= 1024) document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [steps])
  const show = (t: Tab) => (tab === t ? "" : "hidden lg:flex")

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-1 pb-16 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-0">
        <div className={`flex-col bg-[#f1f0ee] px-5 py-6 lg:hidden ${show("tasks") || "flex"}`}>{tasks}</div>
        <div className={`flex-col bg-[#f1f0ee] px-5 py-6 lg:hidden ${show("documents") || "flex"}`}>{documents}</div>
        <section className={`min-h-[70vh] flex-col bg-white lg:min-h-0 ${show("messages") || "flex"}`}>
          <button
            type="button"
            onClick={() => setSteps(true)}
            className={`hidden items-center gap-3 border-b px-6 py-3 text-left text-sm lg:flex ${
              late ? "border-[#EBC9E0] bg-[#FBEDF5] hover:bg-[#F7E4F0]" : "border-[#e4e3e0] hover:bg-[#fafaf9]"
            }`}
          >
            {late > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-[#BC559E]" aria-hidden />}
            <span className="font-semibold">Steps &amp; documents</span>
            {late > 0 && (
              <span className="shrink-0 font-semibold text-[#93407A]">
                {late} {late === 1 ? "step" : "steps"} overdue
              </span>
            )}
            {summary && <span className="min-w-0 flex-1 truncate text-[#5d5b62]">{summary}</span>}
            <span className={`ml-auto shrink-0 ${late ? "font-medium text-[#93407A]" : "text-[#5d5b62]"}`}>Open &rsaquo;</span>
          </button>
          {messages}
        </section>
        <aside
          className={`flex-col border-[#e4e3e0] bg-white px-5 py-6 lg:overflow-y-auto lg:border-l ${show("client") || "flex"}`}
        >
          {client}
        </aside>
      </div>

      {steps && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] hidden lg:block">
          <div onClick={() => setSteps(false)} className="absolute inset-0 bg-[#16151a]/30" />
          <aside className="absolute inset-y-0 left-0 block w-[480px] max-w-[90vw] overflow-y-auto overscroll-contain bg-[#f1f0ee] px-6 py-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSteps(false)}
              aria-label="Close"
              className="mb-3 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5d5b62]"
            >
              &#x2715;
            </button>
            {tasks}
            <div className="mt-8">{documents}</div>
          </aside>
        </div>,
        document.body,
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#e4e3e0] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id)
                window.scrollTo({ top: 0 })
              }}
              className={
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors " +
                (on ? "text-[#16151a]" : "text-[#5d5b62]")
              }
              aria-current={on ? "page" : undefined}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {t.icon}
              </svg>
              {t.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
