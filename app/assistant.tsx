"use client"
// The Marvberry chat. Web: the berry in the corner opens a panel that slides in from
// the right and nudges the page over. Phone: the berry at the bottom opens it full screen.
// The dashboard bar opens the same chat with what the agent typed.
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { askMarvberry, sendFromChat, addShowingFromChat } from "./assistant-actions"
import type { ChatAnswer, ChatCard } from "@/lib/agent-chat"

export const ASK_EVENT = "mb-ask"
const BERRY = "/brand/berry-clear.webp"
const START_CHIPS = ["What’s waiting on me?", "Prepare an agreement", "Send a client a reminder", "Add a new client"]

type Line = { id: number; me: boolean; text: string; card?: ChatCard; chips?: string[] }

export default function Assistant({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const feed = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const ctxClientId = pathname?.match(/^\/clients\/([0-9a-f-]{36})/)?.[1] ?? null

  const show = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" })
  }, [lines, thinking])

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 250)
  }, [open])

  async function ask(text: string) {
    const t = text.trim()
    if (!t || thinking) return
    setDraft("")
    setLines((x) => [...x, { id: Date.now(), me: true, text: t }])
    setThinking(true)
    const res: ChatAnswer = await askMarvberry(t, ctxClientId).catch(() => ({ reply: "I couldn’t work on that just now. Try again in a moment." }))
    setThinking(false)
    setLines((x) => [...x, { id: Date.now() + 1, me: false, text: res.reply, card: res.card, chips: res.chips }])
  }

  // The dashboard bar sends its text here.
  useEffect(() => {
    const on = (e: Event) => {
      show(true)
      const t = (e as CustomEvent<string>).detail
      if (t) ask(t)
    }
    window.addEventListener(ASK_EVENT, on)
    return () => window.removeEventListener(ASK_EVENT, on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking, ctxClientId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && show(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      {!open && (
        <button type="button" className="mba-fab" onClick={() => show(true)} aria-label="Ask Marvberry">
          <img src={BERRY} alt="" />
        </button>
      )}
      <aside className={`mba ${open ? "on" : ""}`} aria-hidden={!open} aria-label="Marvberry">
        <style>{CSS}</style>
        <div className="mba-head">
          <img src={BERRY} alt="" />
          <div>
            <p className="nm">Marvberry</p>
            <p className="st">{thinking ? "Working on it…" : "Here to help"}</p>
          </div>
          <button type="button" className="x" onClick={() => show(false)} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className="mba-feed" ref={feed} aria-live="polite">
          {!lines.length && (
            <div className="mba-hello">
              <p className="b bot">What can I take off your plate today?</p>
              <div className="chips">
                {START_CHIPS.map((c) => (
                  <button key={c} type="button" className="chip" onClick={() => ask(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          {lines.map((l) => (
            <div key={l.id} className="mba-line">
              <p className={`b ${l.me ? "me" : "bot"}`}>{l.text}</p>
              {l.card && <Card card={l.card} close={() => show(false)} />}
              {l.chips && (
                <div className="chips">
                  {l.chips.map((c) => (
                    <button key={c} type="button" className="chip" onClick={() => ask(c)}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {thinking && <p className="dots"><i /><i /><i /></p>}
        </div>

        <form
          className="mba-input"
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
        >
          <textarea
            ref={input}
            rows={1}
            value={draft}
            placeholder="Tell Marvberry what needs to happen…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                ask(draft)
              }
            }}
          />
          <button type="submit" aria-label="Send" disabled={!draft.trim() || thinking}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </button>
        </form>
      </aside>
    </>
  )
}

function Card({ card, close }: { card: ChatCard; close: () => void }) {
  const router = useRouter()
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [edit, setEdit] = useState(false)
  const [body, setBody] = useState(card.type === "message" ? card.body : "")
  const go = (href: string) => {
    close()
    router.push(href)
  }

  if (card.type === "message")
    return (
      <div className="card">
        <p className="ck">To {card.name}</p>
        {edit ? (
          <textarea className="ce" value={body} rows={5} onChange={(e) => setBody(e.target.value)} />
        ) : (
          <p className="cv">{body}</p>
        )}
        {state === "done" ? (
          <p className="ok">Sent to {card.name.split(" ")[0]}’s page.</p>
        ) : (
          <div className="btns">
            <button
              type="button"
              className="a"
              disabled={state === "busy"}
              onClick={async () => {
                setState("busy")
                const r = await sendFromChat(card.clientId, body).catch(() => ({ ok: false }))
                setState(r.ok ? "done" : "error")
              }}
            >
              {state === "busy" ? "Sending…" : "Send"}
            </button>
            <button type="button" className="e" onClick={() => setEdit((v) => !v)}>{edit ? "Done editing" : "Edit"}</button>
          </div>
        )}
        {state === "error" && <p className="err">That didn’t send. Try again.</p>}
      </div>
    )

  if (card.type === "agreement")
    return (
      <div className="card">
        <p className="ck">Buyer agreement · {card.name}</p>
        <p className="cs">{card.ready ? "Filled in with your details" : "Waiting on your agreement"}</p>
        <div className="btns">
          {card.ready ? (
            <button type="button" className="a" onClick={() => go(`/clients/${card.clientId}`)}>Review and send</button>
          ) : (
            <button type="button" className="a" onClick={() => go("/dashboard#setup-card")}>Upload my agreement</button>
          )}
        </div>
      </div>
    )

  if (card.type === "showing")
    return (
      <div className="card">
        <p className="ck">Showing · {card.name}</p>
        <p className="cv">{card.label}{card.place ? <><br />{card.place}</> : null}</p>
        {state === "done" ? (
          <p className="ok">Added to your calendar.</p>
        ) : (
          <div className="btns">
            <button
              type="button"
              className="a"
              disabled={state === "busy"}
              onClick={async () => {
                setState("busy")
                const r = await addShowingFromChat(card.clientId, card.place, card.date, card.start, card.end).catch(() => ({ ok: false }))
                setState(r.ok ? "done" : "error")
              }}
            >
              {state === "busy" ? "Adding…" : "Add to calendar"}
            </button>
            <button type="button" className="e" onClick={() => go("/calendar")}>Open calendar</button>
          </div>
        )}
        {state === "error" && <p className="err">That didn’t save. Try again.</p>}
      </div>
    )

  if (card.type === "client")
    return (
      <div className="card">
        <p className="ck">{card.name}</p>
        <p className="cs">Client added</p>
        <div className="btns">
          <button type="button" className="a" onClick={() => go(`/clients/${card.clientId}`)}>Open {card.name.split(" ")[0]}</button>
        </div>
      </div>
    )

  return (
    <div className="card list">
      {card.items.map((it) => (
        <button key={it.label} type="button" className="li" onClick={() => go(it.href)}>
          <span className="lt">{it.label}</span>
          <span className="ls">{it.sub}</span>
        </button>
      ))}
    </div>
  )
}

const CSS = `
.mba{position:fixed;top:0;right:0;bottom:0;z-index:60;width:380px;max-width:100vw;display:flex;flex-direction:column;background:#fff;border-left:1px solid rgba(22,21,26,.07);box-shadow:-20px 0 50px -40px rgba(22,21,26,.35);transform:translateX(100%);transition:transform .32s cubic-bezier(.2,.9,.3,1);font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#16151a}
.mba.on{transform:none}
.mba-head{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid rgba(22,21,26,.06)}
.mba-head img{width:36px;height:36px;object-fit:contain}
.mba-head .nm{margin:0;font-weight:600;font-size:15px}
.mba-head .st{margin:1px 0 0;font-size:12px;color:#8d8b92}
.mba-head .x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:0;background:transparent;display:grid;place-items:center;cursor:pointer;color:#55535b}
.mba-head .x:hover{background:#f3f2f5}
.mba svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.mba-feed{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:12px}
.mba-line,.mba-hello{display:flex;flex-direction:column;gap:8px}
.mba .b{margin:0;max-width:88%;padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.5;white-space:pre-wrap;animation:mbaIn .35s cubic-bezier(.2,.9,.3,1) both}
.mba .bot{align-self:flex-start;background:#EEEEF1;border-bottom-left-radius:5px}
.mba .me{align-self:flex-end;background:#FBEDF5;color:#7a2f63;border-bottom-right-radius:5px}
.mba .chips{display:flex;flex-wrap:wrap;gap:6px}
.mba .chip{font:inherit;font-size:13px;padding:7px 12px;border-radius:999px;border:1px solid #efc9df;background:#fff;color:#93407A;cursor:pointer;text-align:left}
.mba .chip:hover{background:#FBEDF5}
.mba .card{align-self:stretch;border:1px solid rgba(22,21,26,.08);border-radius:16px;padding:12px 13px;display:flex;flex-direction:column;gap:6px;animation:mbaIn .4s cubic-bezier(.2,.9,.3,1) both}
.mba .ck{margin:0;font-weight:600;font-size:13.5px}
.mba .cs{margin:0;font-size:12.5px;color:#6b6972}
.mba .cv{margin:0;background:#F8F8F8;border-radius:12px;padding:10px 11px;font-size:13.5px;line-height:1.5;color:#3a3940;white-space:pre-wrap}
.mba .ce{font:inherit;font-size:13.5px;line-height:1.5;border:1px solid #e3e1e6;border-radius:12px;padding:10px 11px;resize:vertical;outline:none}
.mba .ce:focus{border-color:#BC559E}
.mba .btns{display:flex;gap:6px;margin-top:4px}
.mba .btns button{flex:1;font:inherit;font-size:13px;font-weight:600;border:0;border-radius:999px;padding:9px 10px;cursor:pointer}
.mba .btns .a{background:#16151a;color:#fff}
.mba .btns .a:disabled{opacity:.6}
.mba .btns .e{background:#EEEEF1;color:#16151a}
.mba .ok{margin:2px 0 0;font-size:12.5px;color:#1f8a4c;font-weight:500}
.mba .err{margin:0;font-size:12.5px;color:#b3261e}
.mba .list{gap:0;padding:4px}
.mba .li{display:flex;flex-direction:column;align-items:flex-start;gap:2px;font:inherit;text-align:left;background:none;border:0;border-radius:12px;padding:9px 10px;cursor:pointer}
.mba .li:hover{background:#F8F8F8}
.mba .lt{font-size:13.5px;font-weight:500}
.mba .ls{font-size:12px;color:#8d8b92}
.mba .dots{align-self:flex-start;display:inline-flex;gap:4px;background:#EEEEF1;border-radius:999px;padding:11px 14px;margin:0}
.mba .dots i{width:6px;height:6px;border-radius:50%;background:#a9a7af;animation:mbaDot 1s infinite}
.mba .dots i:nth-child(2){animation-delay:.15s}.mba .dots i:nth-child(3){animation-delay:.3s}
.mba-input{display:flex;align-items:flex-end;gap:8px;margin:0 12px 14px;border:1px solid rgba(22,21,26,.1);border-radius:22px;padding:6px 6px 6px 14px;background:#fff}
.mba-input textarea{flex:1;font:inherit;font-size:14px;line-height:1.45;border:0;outline:none;resize:none;max-height:120px;padding:6px 0;background:transparent;color:#16151a}
.mba-input button{width:34px;height:34px;border-radius:50%;border:0;background:#16151a;color:#fff;display:grid;place-items:center;cursor:pointer;flex:none}
.mba-input button:disabled{opacity:.35;cursor:default}
.mba-fab{position:fixed;right:22px;bottom:22px;z-index:55;width:60px;height:60px;border-radius:50%;border:1px solid rgba(22,21,26,.06);background:#fff;box-shadow:0 14px 34px -14px rgba(188,85,158,.55);display:grid;place-items:center;cursor:pointer;transition:transform .2s}
.mba-fab:hover{transform:translateY(-2px)}
.mba-fab img{width:42px;height:42px;object-fit:contain;animation:mbaFloat 5s ease-in-out infinite}
@keyframes mbaIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mbaDot{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes mbaFloat{50%{transform:translateY(-3px)}}
@media (max-width:639px){
  .mba{width:100vw;border-left:0;transform:translateY(100%)}
  .mba.on{transform:none}
  .mba-fab{left:50%;right:auto;bottom:16px;transform:translateX(-50%)}
  .mba-fab:hover{transform:translateX(-50%) translateY(-2px)}
}
@media (prefers-reduced-motion:reduce){.mba,.mba *{animation:none!important;transition:none!important}}
`
