"use client"
import { useMemo, useState, useTransition } from "react"
import { addLead, moveLead, updateLead, logTouch, deleteLead } from "./actions"
import { STAGES, STAGE_LABEL, SOURCES, GOAL, alertFor, type Lead, type Stage, type Touch } from "./stages"

export type CardStat = { views: number; bookings: number }
export type CardOption = { id: string; full_name: string | null; slug: string | null }

const DAY = 864e5
const ago = (iso: string, now: number) => {
  const d = Math.floor((now - new Date(iso).getTime()) / DAY)
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`
}
const short = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—")

const field = "w-full rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-[13px] text-[#16151a]"
const pick = "rounded-full border border-[#16151a]/15 bg-white px-3 py-1.5 text-[13px] text-[#16151a]"

export default function Board({
  leads, touches, cards, stats, missing, now: fixedNow,
}: {
  leads: Lead[]; touches: Touch[]; cards: CardOption[]; stats: Record<string, CardStat>; missing?: boolean; now?: number
}) {
  const [now] = useState(() => fixedNow ?? Date.now())
  const [moved, setMoved] = useState<Record<string, Stage>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const [f, setF] = useState({ stage: "", kind: "", town: "", source: "" })
  const [, start] = useTransition()

  const all = useMemo(() => leads.map((l) => (moved[l.id] ? { ...l, stage: moved[l.id] } : l)), [leads, moved])
  const towns = useMemo(() => [...new Set(all.map((l) => l.town).filter(Boolean))].sort() as string[], [all])
  const shown = all.filter(
    (l) =>
      (!f.stage || l.stage === f.stage) &&
      (!f.kind || l.kind === f.kind) &&
      (!f.town || l.town === f.town) &&
      (!f.source || l.source === f.source),
  )
  const due = all.map((l) => ({ l, a: alertFor(l, now) })).filter((x) => x.a) as { l: Lead; a: string }[]

  // Numbers bar: how far every lead got, step to step.
  const n = (k: keyof Lead) => all.filter((l) => l[k]).length
  const week = all.filter((l) => now - new Date(l.created_at).getTime() < 7 * DAY).length
  const paying = all.filter((l) => l.stage === "paid").length
  const numbers = [
    { k: "Texted this week", v: String(week) },
    { k: "Reply rate", v: pct(n("replied_at"), all.length) },
    { k: "Said yes", v: pct(n("yes_at"), n("replied_at")) },
    { k: "Claimed", v: pct(n("claimed_at"), n("yes_at")) },
    { k: "Paid", v: pct(n("paid_at"), n("claimed_at")) },
  ]

  const move = (id: string, stage: Stage) => {
    setMoved((m) => ({ ...m, [id]: stage }))
    start(async () => { await moveLead(id, stage) })
  }
  const open = all.find((l) => l.id === openId) ?? null

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-[14px] text-[#55535b]">Every agent you text, from first message to paying member.</p>
        </div>
        <button onClick={() => setAdding(true)} className="rounded-full bg-[#16151a] px-5 py-2 text-[13px] font-medium text-white">
          Add lead
        </button>
      </div>

      {missing && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Run supabase/pipeline.sql in Supabase, then refresh.
        </p>
      )}

      {/* Numbers bar */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {numbers.map((x) => (
          <div key={x.k} className="rounded-2xl bg-white p-4 ring-1 ring-[#efeeec]">
            <p className="text-[24px] font-semibold tracking-tight">{x.v}</p>
            <p className="mt-0.5 text-[12px] text-[#8e8c93]">{x.k}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-2xl bg-white p-4 ring-1 ring-[#efeeec] sm:col-span-3 lg:col-span-1">
          <p className="text-[24px] font-semibold tracking-tight">
            {paying}<span className="text-[15px] font-normal text-[#8e8c93]"> / {GOAL}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efeeec]">
            <div className="h-full rounded-full bg-[#16151a]" style={{ width: `${Math.min(100, (paying / GOAL) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-[#8e8c93]">Paying members</p>
        </div>
      </section>

      {/* Follow-ups due */}
      {due.length > 0 && (
        <section className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-[#efeeec]">
          <p className="mr-1 text-[13px] font-medium">Follow up today</p>
          {due.map(({ l, a }) => (
            <button key={l.id} onClick={() => setOpenId(l.id)} className="rounded-full bg-[#FBEDF5] px-3 py-1 text-[12px] text-[#93407A]">
              {l.name} · {a}
            </button>
          ))}
        </section>
      )}

      {/* Filters */}
      <section className="mt-4 flex flex-wrap gap-2">
        <select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} className={pick}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={pick}>
          <option value="">Broker and solo</option>
          <option value="broker">Broker / Team Lead</option>
          <option value="solo">Solo Agent</option>
        </select>
        <select value={f.town} onChange={(e) => setF({ ...f, town: e.target.value })} className={pick}>
          <option value="">All towns</option>
          {towns.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className={pick}>
          <option value="">All sources</option>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </section>

      {/* Board */}
      <section className="mt-4 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = shown.filter((l) => l.stage === s)
          return (
            <div
              key={s}
              onDragOver={(e) => { e.preventDefault(); setOver(s) }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={() => { if (dragId) move(dragId, s); setDragId(null); setOver(null) }}
              className={`flex min-w-[168px] flex-1 flex-col gap-2 rounded-2xl p-2 transition-colors ${over === s ? "bg-[#FBEDF5]" : "bg-[#16151a]/[0.03]"}`}
            >
              <p className="flex items-center justify-between px-2 pt-1 text-[12px] font-medium text-[#55535b]">
                {STAGE_LABEL[s]} <span className="text-[#8e8c93]">{col.length}</span>
              </p>
              {col.map((l) => {
                const a = alertFor(l, now)
                return (
                  <button
                    key={l.id}
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => { setDragId(null); setOver(null) }}
                    onClick={() => setOpenId(l.id)}
                    className={`rounded-xl bg-white p-3 text-left ring-1 transition hover:ring-[#16151a]/20 ${a ? "ring-[#BC559E]/40" : "ring-[#efeeec]"} ${dragId === l.id ? "opacity-40" : ""}`}
                  >
                    {a && <p className="mb-1.5 text-[11px] font-medium text-[#93407A]">{a}</p>}
                    <p className="text-[14px] font-medium leading-tight">{l.name}</p>
                    {l.phone && <p className="text-[12px] text-[#8e8c93]">{l.phone}</p>}
                    {(l.brokerage || l.town) && (
                      <p className="mt-1 text-[12px] text-[#55535b]">{[l.brokerage, l.town].filter(Boolean).join(" · ")}</p>
                    )}
                    {l.hook && <p className="mt-1.5 line-clamp-2 text-[12px] italic text-[#55535b]">“{l.hook}”</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#8e8c93]">
                      {l.source && <span className="rounded-full bg-[#F4F3F1] px-2 py-0.5">{l.source}</span>}
                      <span>Last {ago(l.last_contact_at, now)}</span>
                      {l.next_follow_up && <span>Next {short(l.next_follow_up)}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </section>

      {(open || adding) && (
        <Panel
          key={open?.id ?? "new"}
          lead={open}
          touches={open ? touches.filter((t) => t.lead_id === open.id) : []}
          cards={cards}
          stat={open?.agent_id ? stats[open.agent_id] : undefined}
          onMove={(s) => open && move(open.id, s)}
          onClose={() => { setOpenId(null); setAdding(false) }}
        />
      )}
    </main>
  )
}

function Panel({
  lead, touches, cards, stat, onMove, onClose,
}: {
  lead: Lead | null; touches: Touch[]; cards: CardOption[]; stat?: CardStat; onMove: (s: Stage) => void; onClose: () => void
}) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState("")

  const save = (fd: FormData) =>
    start(async () => {
      if (lead) { const e = await updateLead(lead.id, fd); setErr(e || ""); setSaved(!e) }
      else { await addLead(fd); onClose() }
    })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#16151a]/20" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-[460px] overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-tight">{lead ? lead.name : "New lead"}</h2>
          <button onClick={onClose} className="text-[13px] text-[#8e8c93] hover:text-[#16151a]">Close</button>
        </div>

        {lead && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select value={lead.stage} onChange={(e) => onMove(e.target.value as Stage)} className={pick}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            {stat && (
              <p className="text-[13px] text-[#55535b]">
                Card: <b className="font-medium text-[#16151a]">{stat.views}</b> views · <b className="font-medium text-[#16151a]">{stat.bookings}</b> bookings
              </p>
            )}
          </div>
        )}

        <form action={save} onChange={() => setSaved(false)} className="mt-5 flex flex-col gap-3">
          {lead && (
            <L k="Her gift card (linking it moves her to Card Sent)">
              <select name="agent_id" defaultValue={lead.agent_id ?? ""} className={field}>
                <option value="">Not linked</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.slug}</option>)}
              </select>
            </L>
          )}
          <div className="grid grid-cols-2 gap-3">
            <L k="Name"><input name="name" required defaultValue={lead?.name ?? ""} className={field} /></L>
            <L k="Email"><input name="email" type="email" defaultValue={lead?.email ?? ""} className={field} /></L>
            <L k="Cell"><input name="phone" defaultValue={lead?.phone ?? ""} className={field} /></L>
            <L k="Office number"><input name="office_phone" defaultValue={lead?.office_phone ?? ""} className={field} /></L>
            <L k="Brokerage or team"><input name="brokerage" defaultValue={lead?.brokerage ?? ""} className={field} /></L>
            <L k="Town"><input name="town" defaultValue={lead?.town ?? ""} className={field} /></L>
          </div>
          <L k="Address"><input name="address" defaultValue={lead?.address ?? ""} className={field} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L k="Years of experience"><input name="years" defaultValue={lead?.years ?? ""} className={field} /></L>
            <L k="Sold last month"><input name="sold_last_month" defaultValue={lead?.sold_last_month ?? ""} className={field} /></L>
          </div>
          <L k="Zillow link">
            <div className="flex items-center gap-2">
              <input name="zillow_url" type="url" defaultValue={lead?.zillow_url ?? ""} className={field} />
              {lead?.zillow_url && <a href={lead.zillow_url} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] text-[#16151a] underline underline-offset-4">Open</a>}
            </div>
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L k="Source">
              <select name="source" defaultValue={lead?.source ?? ""} className={field}>
                <option value="">—</option>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </L>
            <L k="Type">
              <select name="kind" defaultValue={lead?.kind ?? "solo"} className={field}>
                <option value="solo">Solo Agent</option>
                <option value="broker">Broker / Team Lead</option>
              </select>
            </L>
          </div>
          <L k="Standout detail I used"><input name="hook" defaultValue={lead?.hook ?? ""} className={field} /></L>
          <L k="Message sent"><textarea name="message" rows={4} defaultValue={lead?.message ?? ""} className={field} /></L>
          {lead && <L k="Notes"><textarea name="notes" rows={3} defaultValue={lead.notes ?? ""} className={field} /></L>}
          <div className="grid grid-cols-2 gap-3">
            <L k="Next follow-up"><input name="next_follow_up" type="date" defaultValue={lead?.next_follow_up ?? ""} className={field} /></L>
          </div>
          <div className="flex items-center gap-3">
            <button disabled={pending} className="rounded-full bg-[#16151a] px-5 py-2 text-[13px] font-medium text-white disabled:opacity-50">
              {pending ? "Saving…" : lead ? "Save" : "Add lead"}
            </button>
            {saved && <span className="text-[13px] text-[#8e8c93]">Saved</span>}
            {err && <span className="text-[13px] text-[#b3261e]">{err}</span>}
          </div>
        </form>

        {lead && (
          <>
            <div className="mt-8 border-t border-[#efeeec] pt-5">
              <p className="text-[13px] font-medium">Touches</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Called, texted, left a voicemail…"
                  className={field}
                />
                <button
                  disabled={pending || !note.trim()}
                  onClick={() => start(async () => { await logTouch(lead.id, note); setNote("") })}
                  className="shrink-0 rounded-full border border-[#16151a]/15 px-4 text-[13px] disabled:opacity-40"
                >
                  Log
                </button>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {touches.map((t) => (
                  <li key={t.id} className="text-[13px]">
                    <span className="text-[#8e8c93]">
                      {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>{" "}
                    {t.note}
                  </li>
                ))}
                {touches.length === 0 && <li className="text-[13px] text-[#8e8c93]">Nothing logged yet.</li>}
              </ul>
            </div>
            <button
              onClick={() => { if (confirm(`Delete ${lead.name}?`)) start(async () => { await deleteLead(lead.id); onClose() }) }}
              className="mt-8 text-[13px] text-[#8e8c93] hover:text-[#b3261e]"
            >
              Delete lead
            </button>
          </>
        )}
      </aside>
    </div>
  )
}

function L({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[12px] text-[#8e8c93]">
      {k}
      {children}
    </label>
  )
}
