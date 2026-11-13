"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { markReplied, makeClient, saveCardDetails, startGuideUpload, saveGuideFile, removeGuide, startMarvberry } from "./card-actions"

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
  hasGuide: boolean
  guideBlurb: string
  areas: string
  address: string
  paid: boolean
  free: boolean
  slug: string
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [edit, setEdit] = useState(false)
  const [areas, setAreas] = useState(p.areas)
  const [address, setAddress] = useState(p.address)
  const [gTitle, setGTitle] = useState(p.guideTitle)
  const [gBlurb, setGBlurb] = useState(p.guideBlurb)
  const [file, setFile] = useState<File | null>(null)
  const [gNote, setGNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [offer, setOffer] = useState<Req | null>(null)
  const [starting, setStarting] = useState(false)

  async function yesMarvberry(r: Req | null) {
    setStarting(true)
    const ok = await startMarvberry().catch(() => false)
    if (!ok) return setStarting(false)
    document.cookie = "mb-plan=full; path=/"
    if (r) {
      const id = await makeClient(r.id).catch(() => null)
      if (id) return router.push(`/clients/${id}`)
    }
    router.push("/dashboard")
  }

  async function saveAll() {
    setSaving(true)
    setGNote("")
    const d = await saveCardDetails(areas, address).catch(() => ({ ok: false, message: "Couldn’t save. Try again." }))
    if (!d.ok) {
      setSaving(false)
      return setGNote(d.message)
    }
    let path = ""
    if (file) {
      if (!/\.pdf$/i.test(file.name)) {
        setSaving(false)
        return setGNote("Your guide has to be a PDF.")
      }
      const st = await startGuideUpload(file.size).catch(() => ({ ok: false as const, error: "Couldn’t start the upload. Try again." }))
      if (!st.ok) {
        setSaving(false)
        return setGNote(st.error)
      }
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error } = await sb.storage.from("client-docs").uploadToSignedUrl(st.path, st.token, file, { contentType: "application/pdf" })
      if (error) {
        setSaving(false)
        return setGNote("The upload didn’t finish. Try again.")
      }
      path = st.path
    }
    if (path || p.hasGuide) {
      const g = await saveGuideFile(path, gTitle, gBlurb).catch(() => ({ ok: false, message: "Couldn’t save. Try again." }))
      setGNote(g.message)
    } else setGNote(d.message)
    setSaving(false)
    setFile(null)
    router.refresh()
  }
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
          {!p.paid && (
            <p className="mt-1 text-[13px] text-[#55535b]">
              Want Marvberry to help you reply faster?{" "}
              {p.free ? (
                <button type="button" onClick={() => yesMarvberry(null)} className="text-[#93407A] underline underline-offset-4">Try it free</button>
              ) : (
                <a href="/billing" className="text-[#93407A] underline underline-offset-4">See how it helps</a>
              )}
            </p>
          )}
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
                        if (p.free) return setOffer(r)
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

      {offer && (
        <div className="mt-5 rounded-xl bg-[#FBEDF5] p-5">
          <p className="text-[15px] font-medium text-[#16151a]">Ready to turn {offer.name.split(" ")[0]} into a client?</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#55535b]">Marvberry handles the agreement, the follow-up and everything after. Try it free for 14 days.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={starting} onClick={() => yesMarvberry(offer)} className="rounded-full bg-[#16151a] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60">
              {starting ? "Opening Marvberry…" : "Try Marvberry free"}
            </button>
            <button type="button" onClick={() => setOffer(null)} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#16151a]">Not now</button>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#f1f0ee] pt-4 text-[13.5px]">
        <button type="button" onClick={() => setEdit((v) => !v)} className="text-[#16151a] underline underline-offset-4">
          {edit ? "Close" : "Edit your card"}
        </button>
        <a href="/dashboard/card-export" className="text-[#55535b] underline underline-offset-4">Export your contacts</a>
      </div>
      {p.free && !edit && (
        <p className="mt-4 text-[13.5px] text-[#55535b]">
          Want help with the follow-up?{" "}
          <button type="button" disabled={starting} onClick={() => yesMarvberry(null)} className="text-[#93407A] underline underline-offset-4">Meet Marvberry</button>
        </p>
      )}
      {edit && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-[#55535b]">
            Areas you serve
            <input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Manhattan | Brooklyn" className="rounded-lg border border-[#e6e5e3] px-3 py-2 text-[14px] text-[#16151a] outline-none focus:border-[#BC559E]" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[#55535b]">
            Office address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder={"23 Address Street\nNew York, NY 10001"} className="resize-none rounded-lg border border-[#e6e5e3] px-3 py-2 text-[14px] text-[#16151a] outline-none focus:border-[#BC559E]" />
          </label>
          <div className="mt-1 rounded-xl bg-[#F8F8F8] p-4">
            <p className="text-[14px] font-medium text-[#16151a]">Your free guide</p>
            <p className="mt-0.5 text-[13px] text-[#55535b]">Visitors leave their email to get it. It goes out in your name, and you get their details.</p>
            <input value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="The New Buyer Guide" className="mt-3 w-full rounded-lg border border-[#e6e5e3] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#BC559E]" />
            <input value={gBlurb} onChange={(e) => setGBlurb(e.target.value)} placeholder="One line about what's inside" className="mt-2 w-full rounded-lg border border-[#e6e5e3] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#BC559E]" />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
              <label className="cursor-pointer rounded-full bg-white px-3.5 py-1.5 font-medium text-[#16151a] ring-1 ring-[#e6e5e3]">
                {file ? file.name : p.hasGuide ? "Replace the PDF" : "Upload your guide (PDF)"}
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {p.hasGuide && (
                <>
                  <a href={`/book/${p.slug}/guide`} target="_blank" rel="noreferrer" className="text-[#55535b] underline underline-offset-4">View</a>
                  <button type="button" onClick={async () => { await removeGuide().catch(() => {}); router.refresh() }} className="text-[#55535b] underline underline-offset-4">Remove</button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveAll} disabled={saving} className="rounded-full bg-[#16151a] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            {gNote && <span className="text-[13px] text-[#55535b]">{gNote}</span>}
          </div>
        </div>
      )}
    </section>
  )
}
