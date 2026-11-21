"use client"

import { useEffect, useRef, useState } from "react"

type Tab = "next" | "yourhome" | "homes" | "documents" | "messages"

const ICONS: Record<Tab, React.ReactNode> = {
  next: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.8" />
    </>
  ),
  yourhome: (
    <>
      <path d="M4 11l8-6 8 6v8H4z" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  homes: (
    <>
      <path d="M4 11l8-6 8 6v8H4z" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  documents: (
    <>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5v4h4" />
    </>
  ),
  messages: <path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z" />,
}

const LABEL: Record<Tab, string> = {
  next: "Next step",
  yourhome: "Your home",
  homes: "Homes",
  documents: "Documents",
  messages: "Messages",
}

// Where an in-page link lands on a phone.
const HASH_TAB: Record<string, Tab> = { "#messages": "messages", "#documents": "documents", "#offers": "yourhome", "#homes": "homes" }

// Computer: every section down one page, progress and documents beside messages.
// Phone: one section at a time, switched from a tab bar along the bottom.
export default function PortalTabs({
  next,
  progress,
  yourHome,
  homes,
  documents,
  messages,
  agentFirst,
}: {
  next: React.ReactNode
  progress: React.ReactNode
  yourHome?: React.ReactNode
  homes?: React.ReactNode
  documents: React.ReactNode
  messages: React.ReactNode
  agentFirst: string
}) {
  const [tab, setTab] = useState<Tab>("next")
  // Computer: messages live in a slim panel that slides in from the right.
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const desktop = () => window.matchMedia("(min-width: 768px)").matches
  const on = (t: Tab) => tab === t
  const tabs: Tab[] = ["next", ...(yourHome ? (["yourhome"] as Tab[]) : []), ...(homes ? (["homes"] as Tab[]) : []), "documents", "messages"]

  useEffect(() => {
    const sync = () => {
      const t = HASH_TAB[window.location.hash]
      if (t) setTab(t)
      if (t === "messages" && desktop()) setOpen(true)
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null
      const href = a?.getAttribute("href") || ""
      const t = HASH_TAB[href]
      if (t) setTab(t)
      if (t === "messages" && desktop()) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    sync()
    window.addEventListener("hashchange", sync)
    document.addEventListener("click", click)
    document.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("hashchange", sync)
      document.removeEventListener("click", click)
      document.removeEventListener("keydown", key)
    }
  }, [])

  // When the panel opens: newest message in view, cursor in the box.
  useEffect(() => {
    if (!open) return
    const el = panelRef.current
    const list = el?.querySelector("[data-thread]")
    if (list) list.scrollTop = list.scrollHeight
    const box = el?.querySelector("textarea") as HTMLTextAreaElement | null
    setTimeout(() => box?.focus(), 250)
  }, [open])

  const part = (t: Tab) => (on(t) ? "block" : "hidden md:block")
  const lineTop = "md:border-t md:border-[rgba(194,164,107,.55)]"

  return (
    <>
      <div className={`${part("next")} ${lineTop} pt-2 md:pb-11 md:pt-9`}>{next}</div>
      {yourHome && <div className={`${part("yourhome")} ${lineTop} pt-2 md:pb-11 md:pt-9`}>{yourHome}</div>}
      {homes && <div className={`${part("homes")} ${lineTop} pt-2 md:pb-11 md:pt-9`}>{homes}</div>}

      <div className={`${on("next") ? "mt-12 grid" : on("documents") ? "mt-2 grid" : "hidden md:grid"} gap-11 pb-28 md:mt-0 md:grid-cols-2 md:gap-[72px] md:pb-0 md:pt-[38px] ${lineTop}`}>
        <div className={on("next") ? "block" : "hidden md:block"}>{progress}</div>
        <div className={part("documents")}>{documents}</div>
      </div>

      {/* Phone: the Messages tab. Computer: a slim panel over the page. */}
      {open && (
        <button
          type="button"
          aria-label="Close messages"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 hidden cursor-default bg-[rgba(31,30,28,.12)] md:block"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Messages with ${agentFirst}`}
        className={`${on("messages") ? "flex" : "hidden"} min-h-[calc(100vh-260px)] flex-col pb-28 md:fixed md:inset-y-0 md:right-0 md:z-50 md:flex md:min-h-0 md:w-[440px] md:border-l md:border-[rgba(194,164,107,.55)] md:bg-lxbg md:px-9 md:pb-8 md:pt-9 md:transition-transform md:duration-300 md:ease-out ${
          open ? "md:translate-x-0" : "md:pointer-events-none md:translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close messages"
          className="absolute right-6 top-8 hidden h-10 w-10 items-center justify-center text-lxsoft hover:text-lxink md:flex"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {messages}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[rgba(194,164,107,.55)] bg-lxbg px-2 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 md:hidden"
        aria-label="Sections"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              window.scrollTo({ top: 0 })
            }}
            aria-current={on(t) ? "page" : undefined}
            className={`relative flex min-h-[52px] flex-1 flex-col items-center gap-1 font-luxsans text-[10.5px] ${on(t) ? "text-lxink" : "text-lxsoft"}`}
          >
            {on(t) && <span className="absolute -top-[9px] h-px w-[18px] bg-lxgold" />}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {ICONS[t]}
            </svg>
            {LABEL[t]}
          </button>
        ))}
      </nav>
    </>
  )
}
