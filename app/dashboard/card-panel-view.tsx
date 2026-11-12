"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { markReplied, makeClient, saveGuide } from "./card-actions"

export type Req = {
  id: string
  created_at: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  wants_guide: boolean
  replied_at: string | null
  client_id: string | null
}

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
  if (m < 60) return `${m || 1} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? "" : "s"} ago`
}

export default function CardPanelView(p: {
  url: string
  qr: string
  stats: { k: string; v: number }[]
  answered: number
  asked: number
  waiting: Req[]
  guideTitle: string
  guideUrl: string
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [gTitle, setGTitle] = useState(p.guideTitle)
  const [gUrl, setGUrl] = useState(p.guideUrl)
  const [gNote, setGNote] = useState("")
  const [busy, setBusy] = useState("")

  const qrHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.qr)}`

  return (
    <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-[#efeeec] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8e8c93]">Your card</p>
          <p className="mt-2 truncate text-[15px] text-[#16151a]">{p.url.replace(/^https?:\/\//, "")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(p.url).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }}
              className="rounded-full bg-[#16151a] px-4 py-2 text-[13px] font-medium text-white"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={p.url} target="_blank" rel="noreferrer" className="rounded-full bg-[#EEEEF1] px-4 py-2 text-[13px] font-medium text-[#16151a]">
              Open card
            </a>
            <a href={qrHref} download="my-card-qr.svg" className="rounded-full bg-[#EEEEF1] px-4 py-2 text-[13px] font-medium text-[#16151a]">
              Download QR code
            </a>
          </div>
        </div>
        <div className="h-[96px] w-[96px] flex-none overflow-hidden rounded-lg ring-1 ring-[#efeeec] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: p.qr }} />
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2 border-t border-[#f1f0ee] pt-5">
        {p.stats.map((s) => (
          <div key={s.k}>
            <p className="text-[22px] font-medium leading-none text-[#16151a]">{s.v}</p>
            <p className="mt-1.5 text-[12px] text-[#8e8c93]">{s.k}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13.5px] text-[#55535b]">
        {p.asked === 0
          ? "When someone asks to be contacted, you’ll see whether you got back to them here."
          : `You answered ${p.answered} of ${p.asked} people who asked to be contacted.`}
        <span className="text-[#8e8c93]"> Last 30 days.</span>
      </p>

      {p.waiting.length > 0 && (
        <div className="mt-5 border-t border-[#f1f0ee] pt-5">
          <p className="text-[14px] font-medium text-[#93407A]">{p.waiting.length} waiting on you</p>
          <ul className="mt-3 flex flex-col gap-3">
            {p.waiting.map((r) => {
              const first = r.name.split(" ")[0]
              const body = encodeURIComponent(`Hi ${first},\n\nThanks for reaching out from my card. `)
              return (
                <li key={r.id} className="rounded-xl bg-[#F8F8F8] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-medium text-[#16151a]">{r.name}</p>
                    <p className="flex-none text-[12px] text-[#8e8c93]">{ago(r.created_at)}</p>
                  </div>
                  <p className="mt-0.5 text-[13px] text-[#55535b]">
                    {r.wants_guide ? "Got your guide" : "Asked you to reach out"}
                    {[r.email, r.phone].filter(Boolean).length ? ` · ${[r.email, r.phone].filter(Boolean).join(" · ")}` : ""}
                  </p>
                  {r.message && <p className="mt-2 text-[13.5px] leading-relaxed text-[#16151a]">“{r.message}”</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.email && (
                      <a href={`mailto:${r.email}?subject=${encodeURIComponent("Thanks for reaching out")}&body=${body}`} className="rounded-full bg-[#16151a] px-3.5 py-1.5 text-[12.5px] font-medium text-white">
                        Email {first}
                      </a>
                    )}
                    {r.phone && (
                      <a href={`sms:${r.phone}`} className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#16151a] ring-1 ring-[#e6e5e3]">
                        Text {first}
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={async () => {
                        setBusy(r.id)
                        await markReplied(r.id).catch(() => {})
                        setBusy("")
                        router.refresh()
                      }}
                      className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#16151a] ring-1 ring-[#e6e5e3]"
                    >
                      I got back to them
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={async () => {
                        setBusy(r.id)
                        const id = await makeClient(r.id).catch(() => null)
                        setBusy("")
                        if (id) router.push(`/clients/${id}`)
                      }}
                      className="rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#16151a] ring-1 ring-[#e6e5e3]"
                    >
                      Make them a client
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-[#f1f0ee] pt-4">
        {!guideOpen ? (
          <button type="button" onClick={() => setGuideOpen(true)} className="text-[13.5px] text-[#55535b] underline underline-offset-4">
            {p.guideUrl ? `Your free guide: ${p.guideTitle || "Free buyer guide"}. Change it` : "Offer a free guide on your card"}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[13.5px] text-[#55535b]">Visitors leave their email to get it, and you get their details.</p>
            <input value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="The New Buyer Guide" className="rounded-lg border border-[#e6e5e3] px-3 py-2 text-[14px] outline-none focus:border-[#BC559E]" />
            <input value={gUrl} onChange={(e) => setGUrl(e.target.value)} placeholder="Link to the guide (Google Drive, Dropbox, your site)" className="rounded-lg border border-[#e6e5e3] px-3 py-2 text-[14px] outline-none focus:border-[#BC559E]" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const r = await saveGuide(gTitle, gUrl).catch(() => ({ ok: false, message: "Couldn’t save. Try again." }))
                  setGNote(r.message)
                  if (r.ok) router.refresh()
                }}
                className="rounded-full bg-[#16151a] px-4 py-2 text-[13px] font-medium text-white"
              >
                Save
              </button>
              <button type="button" onClick={() => setGuideOpen(false)} className="rounded-full bg-[#EEEEF1] px-4 py-2 text-[13px] font-medium text-[#16151a]">
                Close
              </button>
              {gNote && <span className="text-[13px] text-[#55535b]">{gNote}</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
