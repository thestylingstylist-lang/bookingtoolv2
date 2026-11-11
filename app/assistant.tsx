"use client"
// The Marvberry chat. Web: the berry in the corner opens a panel that slides in from
// the right and nudges the page over. Phone: the berry at the bottom opens it full screen.
// The dashboard bar opens the same chat with what the agent typed.
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { askMarvberry, sendFromChat, addShowingFromChat, assistantName, sendAgreementFromChat, sendOfferFromChat } from "./assistant-actions"
import type { ChatAnswer, ChatCard } from "@/lib/agent-chat"

export const ASK_EVENT = "mb-ask"
const BERRY = "/brand/berry-clear.webp"
const START_CHIPS = ["What’s waiting on me?", "Prepare an agreement", "Prepare an offer", "Send a client an update"]

type Line = { id: number; me: boolean; text: string; cards?: ChatCard[]; chips?: string[] }

// What a card was, in words, so the assistant remembers it on the next turn.
const cardNote = (c: ChatCard) =>
  c.type === "message" ? `[Drafted a message to ${c.name}: "${c.body.slice(0, 300)}"]`
  : c.type === "agreement" ? `[Prepared ${c.name}'s ${c.title} for review]`
  : c.type === "offer" ? `[Prepared an offer for ${c.name}: ${c.rows.map((r) => `${r.k} ${r.v}`).join("; ")}]`
  : c.type === "showing" ? `[Prepared a showing for ${c.name}: ${c.label} ${c.place}]`
  : c.type === "client" ? `[Added ${c.name}, client id ${c.clientId}]`
  : ""

export default function Assistant({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const [name, setName] = useState("Marvberry")
  const linesRef = useRef<Line[]>([])
  linesRef.current = lines
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

  useEffect(() => {
    assistantName().then(setName).catch(() => {})
  }, [])

  async function ask(text: string) {
    const t = text.trim()
    if (!t || thinking) return
    setDraft("")
    const history = [...linesRef.current, { id: 0, me: true, text: t }].map((l) => ({
      me: l.me,
      text: [l.text, ...(l.cards ?? []).map(cardNote)].filter(Boolean).join("\n"),
    }))
    setLines((x) => [...x, { id: Date.now(), me: true, text: t }])
    setThinking(true)
    const res: ChatAnswer = await askMarvberry(history, ctxClientId).catch(() => ({ reply: "I couldn’t work on that just now. Try again in a moment." }))
    setThinking(false)
    setLines((x) => [...x, { id: Date.now() + 1, me: false, text: res.reply, cards: res.cards, chips: res.chips }])
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
        <button type="button" className="mba-fab" onClick={() => show(true)} aria-label={`Ask ${name}`}>
          <img src={BERRY} alt="" />
        </button>
      )}
      <aside className={`mba ${open ? "on" : ""}`} aria-hidden={!open} aria-label={name}>
        <style>{CSS}</style>
        <div className="mba-head">
          <img src={BERRY} alt="" />
          <div>
            <p className="nm">{name}</p>
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
              {l.cards?.map((c, i) => <Card key={i} card={c} close={() => show(false)} />)}
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
            placeholder={`Tell ${name} what to take care of…`}
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
  const [note, setNote] = useState("")
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

  if (card.type === "agreement_setup")
    return (
      <div className="card">
        <p className="ck">Your buyer agreement</p>
        <p className="cs">Upload it once, and every client’s is filled in for you.</p>
        <div className="btns">
          <button type="button" className="a" onClick={() => go("/dashboard#setup-card")}>Upload my agreement</button>
        </div>
      </div>
    )

  if (card.type === "agreement")
    return (
      <div className="card">
        <p className="ck">{card.title} · {card.name}</p>
        <p className="cs">{card.email ? `Goes to ${card.email} to sign` : "No email on file. It goes on their page."}</p>
        <div className="doc">{card.body}</div>
        {state === "done" ? (
          <p className="ok">{note}</p>
        ) : (
          <div className="btns">
            <button type="button" className="a" onClick={() => setEdit(true)}>Review agreement</button>
          </div>
        )}
        {edit && (
          <AgreementReview
            card={card}
            close={() => setEdit(false)}
            sent={(msg) => {
              setNote(msg)
              setState("done")
              setEdit(false)
            }}
          />
        )}
      </div>
    )

  if (card.type === "offer")
    return (
      <div className="card">
        <p className="ck">Offer · {card.name}</p>
        <div className="rows">
          {card.rows.map((r) => (
            <p key={r.k}><span>{r.k}</span>{r.v}</p>
          ))}
        </div>
        {card.offer.message && <p className="cv">{card.offer.message}</p>}
        {card.attach.length > 0 && <p className="cs">Attached: {card.attach.join(", ")}</p>}
        {state === "done" ? (
          <p className="ok">{note}</p>
        ) : (
          <div className="btns">
            <button
              type="button"
              className="a"
              disabled={state === "busy"}
              onClick={async () => {
                setState("busy")
                const r = await sendOfferFromChat(card.clientId, card.offer).catch(() => ({ ok: false, message: "That didn’t send. Try again." }))
                setNote(r.message)
                setState(r.ok ? "done" : "error")
              }}
            >
              {state === "busy" ? "Sending…" : "Send offer"}
            </button>
            <button type="button" className="e" onClick={() => go(`/clients/${card.clientId}`)}>Open file</button>
          </div>
        )}
        {state === "error" && <p className="err">{note}</p>}
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
        <p className="cs">{card.sub}</p>
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

// The full-size review: the whole agreement, readable, editable, and sent from here.
function AgreementReview({ card, close, sent }: { card: Extract<ChatCard, { type: "agreement" }>; close: () => void; sent: (msg: string) => void }) {
  const [body, setBody] = useState(card.body)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [close])
  return createPortal(
    <div className="mbr" role="dialog" aria-modal="true" aria-label={`${card.title} for ${card.name}`} onClick={close}>
      <div className="mbr-box" onClick={(e) => e.stopPropagation()}>
        <div className="mbr-head">
          <div>
            <p className="t">{card.title}</p>
            <p className="s">{card.name}{card.email ? ` · goes to ${card.email} to sign` : " · no email on file, it goes on their page"}</p>
          </div>
          <button type="button" className="x" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="mbr-body">
          {editing ? (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Agreement text" />
          ) : (
            <div className="paper">{body}</div>
          )}
        </div>
        <div className="mbr-foot">
          {err && <p className="err">{err}</p>}
          <button type="button" className="e" onClick={() => setEditing((v) => !v)}>{editing ? "Done editing" : "Edit"}</button>
          <button
            type="button"
            className="a"
            disabled={busy || !body.trim()}
            onClick={async () => {
              setBusy(true)
              setErr("")
              const r = await sendAgreementFromChat(card.clientId, card.title, body).catch(() => ({ ok: false, message: "That didn’t send. Try again." }))
              setBusy(false)
              if (r.ok) sent(r.message)
              else setErr(r.message)
            }}
          >
            {busy ? "Sending…" : "Send for signature"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
.mba .doc{margin:0;background:#F8F8F8;border-radius:12px;padding:10px 11px;font-size:12.5px;line-height:1.55;color:#3a3940;white-space:pre-wrap;max-height:120px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 60%,transparent)}
.mbr{position:fixed;inset:0;z-index:80;background:rgba(22,21,26,.42);display:grid;place-items:center;padding:24px;font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#16151a;animation:mbaFade .2s both}
.mbr-box{width:min(820px,100%);height:min(92vh,1000px);background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px -30px rgba(22,21,26,.5);animation:mbaIn .3s cubic-bezier(.2,.9,.3,1) both}
.mbr-head{display:flex;align-items:flex-start;gap:12px;padding:20px 22px 16px;border-bottom:1px solid rgba(22,21,26,.07)}
.mbr-head .t{margin:0;font-size:18px;font-weight:600}
.mbr-head .s{margin:3px 0 0;font-size:13px;color:#77757d}
.mbr-head .x{margin-left:auto;width:36px;height:36px;border-radius:50%;border:0;background:transparent;display:grid;place-items:center;cursor:pointer;color:#55535b}
.mbr-head .x:hover{background:#f3f2f5}
.mbr svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
.mbr-body{flex:1;overflow-y:auto;background:#F8F8F8;padding:24px}
.mbr-body .paper{max-width:680px;margin:0 auto;background:#fff;border-radius:8px;padding:44px 48px;font-size:15px;line-height:1.7;white-space:pre-wrap;box-shadow:0 1px 3px rgba(22,21,26,.06)}
.mbr-body textarea{display:block;width:100%;max-width:680px;min-height:100%;margin:0 auto;font:inherit;font-size:15px;line-height:1.7;border:1px solid #BC559E;border-radius:8px;padding:44px 48px;outline:none;resize:none;background:#fff;color:#16151a}
.mbr-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid rgba(22,21,26,.07)}
.mbr-foot button{font:inherit;font-size:14px;font-weight:600;border:0;border-radius:999px;padding:11px 20px;cursor:pointer}
.mbr-foot .a{background:#16151a;color:#fff}
.mbr-foot .a:disabled{opacity:.6}
.mbr-foot .e{background:#EEEEF1;color:#16151a}
.mbr-foot .err{margin:0 auto 0 0;font-size:13px;color:#b3261e}
@keyframes mbaFade{from{opacity:0}to{opacity:1}}
@media (max-width:639px){.mbr{padding:0}.mbr-box{height:100%;border-radius:0}.mbr-body{padding:12px}.mbr-body .paper,.mbr-body textarea{padding:24px 20px}}
.mba .rows{display:flex;flex-direction:column;gap:5px;background:#F8F8F8;border-radius:12px;padding:10px 11px}
.mba .rows p{margin:0;display:flex;gap:10px;font-size:13px;line-height:1.4}
.mba .rows span{flex:none;width:96px;color:#8d8b92}
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
