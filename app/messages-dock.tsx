"use client"

import "./suite-fonts"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { loadInbox, loadThread, sendFromDock, clientFirstName, type InboxRow, type Thread } from "./dock-actions"

// Messages from anywhere in the agent app. Lives in the root layout, so moving
// between pages never closes the chat, resets it or clears an unsent message.
// Wide screens: the panel pushes the page over. Below 1200px it covers the page.

const AGENT_PATHS = ["/dashboard", "/clients", "/calendar", "/bookings", "/templates", "/settings", "/start-here", "/billing", "/my-card", "/support"]
const KEY = "mb-dock"
const TINTS = ["#D6E6EC", "#B9C7AE", "#D9D0E6", "#EBC4C8"]
const tint = (s: string) => TINTS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length]

type Saved = { open: boolean; chatId: string | null; drafts: Record<string, string> }

function Face({ initials, size = 30, ring = false }: { initials: string; size?: number; ring?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-lux text-lxink"
      style={{
        width: size,
        height: size,
        background: tint(initials),
        fontSize: Math.round(size * 0.36),
        letterSpacing: ".3px",
        boxShadow: ring ? "0 0 0 2px #F8F8F8" : undefined,
      }}
    >
      {initials}
    </span>
  )
}

const Dot = () => <span aria-label="Unread" className="h-[7px] w-[7px] shrink-0 rounded-full bg-lxblush" />

function when(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  if (days === 1) return "Yesterday"
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
const stamp = (iso: string) => {
  const w = when(iso)
  const t = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return /\d:\d\d/.test(w) ? w : `${w}, ${t}`
}

export default function MessagesDock() {
  const pathname = usePathname() || ""
  const onAgentPage = AGENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const [cardPlan, setCardPlan] = useState(false)
  const [restored, setRestored] = useState(false)
  const [open, setOpen] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<InboxRow[] | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [pageName, setPageName] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const active = onAgentPage && !cardPlan

  // Bring back the last state: open or folded, which chat, unsent words.
  useEffect(() => {
    setCardPlan(/(^|; )mb-plan=card/.test(document.cookie))
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || "null") as Saved | null
      if (s) {
        setOpen(!!s.open)
        setChatId(s.chatId)
        setDrafts(s.drafts || {})
      }
    } catch {}
    setRestored(true)
  }, [])
  useEffect(() => {
    if (!restored) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ open, chatId, drafts } satisfies Saved))
    } catch {}
  }, [restored, open, chatId, drafts])

  // Tell the page (push-over) and the assistant button (stacking).
  useEffect(() => {
    const b = document.body.dataset
    b.dock = active && open ? "open" : "closed"
    if (active) b.dockReady = "1"
    else delete b.dockReady
    return () => {
      delete b.dock
      delete b.dockReady
    }
  }, [active, open])

  // The assistant and the messages panel take turns on the right.
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener("mb:assistant-open", close)
    return () => window.removeEventListener("mb:assistant-open", close)
  }, [])
  const show = useCallback((v: boolean) => {
    setOpen(v)
    if (v) window.dispatchEvent(new Event("mb:dock-open"))
  }, [])

  // Inbox: now, then every 30 seconds while the tab is in view.
  const refreshInbox = useCallback(async () => {
    const r = await loadInbox().catch(() => null)
    if (r) setRows(r.rows)
  }, [])
  useEffect(() => {
    if (!active) return
    refreshInbox()
    const t = setInterval(() => document.visibilityState === "visible" && refreshInbox(), 30_000)
    return () => clearInterval(t)
  }, [active, refreshInbox])

  // The open chat: load it, then keep it fresh while it's showing.
  const refreshThread = useCallback(async (id: string) => {
    const t = await loadThread(id).catch(() => null)
    if (t) {
      setThread(t)
      setRows((rs) => rs?.map((r) => (r.clientId === id ? { ...r, unread: false } : r)) ?? rs)
    }
  }, [])
  useEffect(() => {
    if (!active || !open || !chatId) return
    if (thread?.clientId !== chatId) setThread(null)
    refreshThread(chatId)
    const t = setInterval(() => document.visibilityState === "visible" && refreshThread(chatId), 15_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open, chatId, refreshThread])

  // Newest message in view.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread?.messages.length, open])

  // On another client's page? Offer that chat, never switch by itself.
  const pageClient = pathname.match(/^\/clients\/([0-9a-f-]{36})/i)?.[1] ?? null
  useEffect(() => {
    setPageName(null)
    if (!active || !pageClient || pageClient === chatId) return
    const known = rows?.find((r) => r.clientId === pageClient)
    if (known) {
      setPageName(known.name.split(" ")[0])
      return
    }
    let live = true
    clientFirstName(pageClient).then((n) => live && setPageName(n))
    return () => {
      live = false
    }
  }, [active, pageClient, chatId, rows])

  // Esc folds the panel back into the pill.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [])

  if (!active) return null

  const draft = chatId ? drafts[chatId] ?? "" : ""
  const setDraft = (v: string) => chatId && setDrafts((d) => ({ ...d, [chatId]: v }))
  const anyUnread = !!rows?.some((r) => r.unread)
  const faces = (rows ?? []).slice(0, 3)

  async function send() {
    if (!chatId || !draft.trim() || sending) return
    setSending(true)
    setFailed(false)
    const id = chatId
    const r = await sendFromDock(id, draft).catch(() => ({ ok: false as const }))
    setSending(false)
    if (!r.ok) {
      setFailed(true)
      return
    }
    setDrafts((d) => ({ ...d, [id]: "" }))
    setThread((t) => (t && t.clientId === id ? { ...t, messages: [...t.messages, r.message] } : t))
    refreshInbox()
    boxRef.current?.focus()
  }

  const iconBtn = "flex h-10 w-10 items-center justify-center text-lxsoft transition-colors hover:text-lxink"
  const collapse = (
    <button type="button" onClick={() => setOpen(false)} aria-label="Fold messages away" className={`${iconBtn} -mr-2.5`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )

  return (
    <>
      {/* The pill: the initials bubbles as before, with a paper plane in place of the word */}
      {!open && (
        <button
          type="button"
          onClick={() => show(true)}
          aria-label={anyUnread ? "Messages, new messages waiting" : "Messages"}
          title="Messages"
          className={`fixed bottom-[22px] right-[22px] z-[56] flex h-[50px] items-center gap-3 rounded-full border border-[rgba(194,164,107,.6)] bg-lxbg ${faces.length ? "pl-2.5 pr-4" : "px-[15px]"} font-luxsans text-[13px] tracking-[.3px] text-lxink shadow-[0_1px_2px_rgba(31,30,28,.06)] transition-colors hover:border-lxgold`}
        >
          {faces.length > 0 && (
            <span className="flex">
              {faces.map((f, i) => (
                <span key={f.clientId} style={{ marginLeft: i ? -5 : 0, zIndex: 3 - i }} className="relative">
                  <Face initials={f.initials} ring />
                </span>
              ))}
            </span>
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 3 3 10.5l7 2.6L21 3Z" />
            <path d="M21 3 13.4 21l-3.4-7.9" />
          </svg>
          {anyUnread && <Dot />}
        </button>
      )}

      {/* Below 1200px the panel covers the page; tap outside to fold it away. */}
      {open && (
        <button
          type="button"
          aria-label="Fold messages away"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[57] cursor-default bg-[rgba(31,30,28,.12)] min-[1200px]:hidden"
        />
      )}

      <aside
        aria-label="Messages"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[58] flex w-full flex-col border-l border-[rgba(194,164,107,.55)] bg-lxbg font-luxsans text-lxink transition-transform duration-300 ease-out sm:w-[400px] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        {chatId && pageClient && pageClient !== chatId && pageName && (
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(31,30,28,.09)] bg-[rgba(214,230,236,.35)] px-8 py-[11px] text-[12.5px] text-lxsoft">
            <span className="whitespace-nowrap">You&rsquo;re on {pageName}&rsquo;s page.</span>
            <button type="button" onClick={() => setChatId(pageClient)} className="whitespace-nowrap border-0 border-b border-lxgold bg-transparent p-0 text-lxink">
              Message {pageName}
            </button>
          </div>
        )}

        {!chatId ? (
          <>
            <div className="px-8 pt-6">
              <div className="flex min-h-[44px] items-center justify-between">
                <h2 className="m-0 font-lux text-[30px] font-light">Messages</h2>
                {collapse}
              </div>
              <p className="m-0 mb-2.5 mt-1 text-[12.5px] text-lxsoft">Every client conversation, newest first.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {rows === null && <p className="py-6 text-[13px] text-lxsoft">Opening your messages&hellip;</p>}
              {rows?.length === 0 && (
                <p className="py-6 text-[14px] leading-relaxed text-lxsoft">
                  No conversations yet. When a client writes from their suite, it shows up here.
                </p>
              )}
              {rows?.map((r) => (
                <button
                  key={r.clientId}
                  type="button"
                  onClick={() => setChatId(r.clientId)}
                  className="flex w-full items-center gap-3.5 border-b border-[rgba(31,30,28,.09)] bg-transparent py-4 text-left"
                >
                  <Face initials={r.initials} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2.5">
                      <span className={`font-lux text-[19px] ${r.unread ? "font-medium" : ""}`}>{r.name}</span>
                      <span className="whitespace-nowrap text-[11.5px] text-lxsoft">{when(r.at)}</span>
                    </span>
                    <span className="mt-[3px] flex items-center gap-2.5">
                      <span className={`flex-1 truncate text-[13px] ${r.unread ? "text-lxink" : "text-lxsoft"}`}>
                        {r.mine ? "You: " : ""}
                        {r.last}
                      </span>
                      {r.unread && <Dot />}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="px-8 pt-[18px]">
              <div className="flex min-h-[44px] items-center justify-between">
                <button type="button" onClick={() => setChatId(null)} className="inline-flex items-center gap-1.5 bg-transparent p-0 text-[13px] text-lxsoft hover:text-lxink">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden>
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                  All messages
                </button>
                {collapse}
              </div>
              <div className="flex items-center gap-3 border-b border-[rgba(194,164,107,.55)] pb-[18px] pt-3.5">
                <Face initials={thread?.initials ?? rows?.find((r) => r.clientId === chatId)?.initials ?? "\u00b7"} size={42} />
                <div className="min-w-0">
                  <Link
                    href={`/clients/${chatId}`}
                    className="font-lux text-[22px] font-medium text-lxink no-underline [border-bottom:1px_solid_#C2A46B]"
                  >
                    {thread?.name ?? rows?.find((r) => r.clientId === chatId)?.name ?? "\u2026"}
                  </Link>
                  {thread?.sub && <p className="m-0 mt-1 text-[12px] text-lxsoft">{thread.sub}</p>}
                </div>
              </div>
            </div>

            <div ref={threadRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-8 py-[18px] [&>:first-child]:mt-auto">
              {thread && thread.messages.length === 0 && (
                <p className="text-center text-[13px] text-lxsoft">No messages yet. Say hello.</p>
              )}
              {thread?.messages.map((m) => (
                <div key={m.id} className={`flex flex-col gap-1 ${m.mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-[14px] px-[15px] py-[11px] text-[14px] leading-[1.55] ${
                      m.mine ? "bg-[#EFEDE9]" : "border border-[rgba(31,30,28,.09)] bg-white"
                    }`}
                  >
                    {m.body}
                  </div>
                  <span className="text-[10.5px] text-lxsoft">{stamp(m.at)}</span>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
              className="flex items-end gap-3.5 border-t border-[rgba(194,164,107,.55)] px-8 pb-[26px] pt-3.5"
            >
              <label className="flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  ref={boxRef}
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder={`Write to ${(thread?.name ?? "").split(" ")[0] || "your client"}\u2026`}
                  className="max-h-40 w-full resize-none border-0 bg-transparent px-0 py-2 text-[14px] leading-[1.55] text-lxink outline-none placeholder:text-[#8f8b84]"
                />
              </label>
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="min-h-[40px] border-0 border-b border-lxgold bg-transparent p-0 text-[13px] text-lxink disabled:opacity-50"
              >
                {sending ? "Sending\u2026" : "Send"}
              </button>
            </form>
            {failed && <p className="-mt-4 px-8 pb-4 text-[12px] text-red-800">That didn&rsquo;t send. Your words are still here. Try again.</p>}
          </>
        )}
      </aside>
    </>
  )
}
