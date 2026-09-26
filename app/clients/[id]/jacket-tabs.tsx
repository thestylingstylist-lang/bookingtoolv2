"use client"

import { useState } from "react"

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
  tasks,
  documents,
  messages,
  client,
}: {
  tasks: React.ReactNode
  documents: React.ReactNode
  messages: React.ReactNode
  client: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>("messages")
  const show = (t: Tab) => (tab === t ? "" : "hidden lg:flex")

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-1 pb-16 lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:pb-0">
        <div
          className={`flex-col border-[#e6dbd0] bg-[#f1ebe2] px-5 py-6 lg:overflow-y-auto lg:border-r ${show("tasks") || "flex"}`}
        >
          {tasks}
          <div className="mt-8 hidden lg:block">{documents}</div>
        </div>
        <div
          className={`flex-col bg-[#f1ebe2] px-5 py-6 lg:hidden ${show("documents") || "flex"}`}
        >
          {documents}
        </div>
        <section className={`min-h-[70vh] flex-col bg-white lg:min-h-0 ${show("messages") || "flex"}`}>
          {messages}
        </section>
        <aside
          className={`flex-col border-[#e6dbd0] bg-white px-5 py-6 lg:overflow-y-auto lg:border-l ${show("client") || "flex"}`}
        >
          {client}
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[#e6dbd0] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
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
                (on ? "text-[#5c0a17]" : "text-[#8a6f6c]")
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
