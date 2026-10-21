"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { addHome, saveHome, setHomeStatus, removeHome, type HomeResult } from "./homes-actions"

export type HomeView = {
  id: string
  address: string
  listingUrl: string
  agentName: string
  agentBrokerage: string
  agentEmail: string
  agentPhone: string
  notes: string
  status: "active" | "passed"
  showDate: string // yyyy-mm-dd in the realtor's time zone, or ""
  showTime: string // HH:mm, or ""
  showLabel: string // "Thursday, October 22 at 4 PM", or ""
  shown: boolean // the showing time has passed
}

// The one next move for a house, in plain words.
function nextMove(h: HomeView, first: string) {
  if (!h.showLabel) return { line: "No showing set yet.", action: "Set the showing", dot: false }
  if (!h.shown) return { line: `Showing ${h.showLabel}.`, action: "Open", dot: false }
  if (!h.notes) return { line: `Seen ${h.showLabel.replace(/ at .*/, "")}. How did it go?`, action: first ? `Add ${first}'s notes` : "Add notes", dot: true }
  return { line: `“${h.notes.length > 70 ? h.notes.slice(0, 70) + "…" : h.notes}”`, action: "Open", dot: false }
}

const input =
  "w-full rounded-xl border border-[#dedad4] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"

export default function Homes({ clientId, clientFirst, homes }: { clientId: string; clientFirst: string; homes: HomeView[] }) {
  const [drawer, setDrawer] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const active = homes.filter((h) => h.status === "active")
  // The one home that most needs a move, for the summary line.
  const urgent = active.find((h) => nextMove(h, clientFirst).dot) ?? active.find((h) => !h.showLabel) ?? active[0]
  const close = () => {
    setDrawer(false)
    setOpenId(null)
  }

  return (
    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#e4e3e0] bg-white px-6 py-3">
      <p className="text-[15px] font-semibold">Homes</p>
      <p className="min-w-0 flex-1 truncate text-[13.5px] text-[#5d5b62]">
        {homes.length === 0
          ? `Add the homes ${clientFirst || "your client"} is looking at.`
          : <>
              {active.length} {active.length === 1 ? "home" : "homes"}
              {urgent && (
                <>
                  {" \u00b7 "}
                  {nextMove(urgent, clientFirst).dot && <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[#D9467A] align-[1px]" />}
                  {urgent.address.split(",")[0]}: {nextMove(urgent, clientFirst).line}
                </>
              )}
            </>}
      </p>
      <button onClick={() => setDrawer(true)} className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white">
        {homes.length === 0 ? "Add a home" : "Open homes"}
      </button>

      {drawer && (
        <Drawer onClose={close}>
          {openId && homes.find((h) => h.id === openId) ? (
            <HomePanel
              key={openId}
              home={homes.find((h) => h.id === openId)!}
              clientFirst={clientFirst}
              onBack={() => setOpenId(null)}
            />
          ) : (
            <HomeList clientId={clientId} clientFirst={clientFirst} homes={homes} onOpen={setOpenId} />
          )}
        </Drawer>
      )}
    </section>
  )
}

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[#16151a]/30" />
      <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-white px-6 py-6 shadow-2xl sm:w-[500px] sm:px-8">
        <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f0ee] text-[#5d5b62]">
          &#x2715;
        </button>
        {children}
      </aside>
    </div>
  )
}

function HomeList({
  clientId,
  clientFirst,
  homes,
  onOpen,
}: {
  clientId: string
  clientFirst: string
  homes: HomeView[]
  onOpen: (id: string) => void
}) {
  const [showPassed, setShowPassed] = useState(false)
  const [state, add, adding] = useActionState<HomeResult | null, FormData>(addHome, null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])
  const active = homes.filter((h) => h.status === "active")
  const passed = homes.filter((h) => h.status === "passed")

  return (
    <>
      <h3 className="pr-12 font-serif text-[26px] leading-tight">Homes{clientFirst ? ` for ${clientFirst}` : ""}</h3>
      <form ref={formRef} action={add} className="mt-5 flex items-center gap-2 rounded-xl border border-[#e4e3e0] bg-white p-1.5 pl-4">
        <input type="hidden" name="clientId" value={clientId} />
        <input
          name="home"
          placeholder="Paste a Zillow link or an address"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-[#aaa6a0]"
        />
        <button disabled={adding} className="shrink-0 rounded-lg bg-[#f1f0ee] px-4 py-2 text-sm font-medium disabled:opacity-60">
          {adding ? "Adding\u2026" : "Add home"}
        </button>
      </form>
      {state && !state.ok && <p className="mt-2 text-sm text-[#b42318]">{state.message}</p>}

      <div className="mt-4 space-y-3">
        {[...active, ...(showPassed ? passed : [])].map((h) => {
          const m = nextMove(h, clientFirst)
          const isPassed = h.status === "passed"
          return (
            <div key={h.id} className={`rounded-2xl border border-[#e4e3e0] p-4 ${isPassed ? "opacity-60" : ""}`}>
              <button onClick={() => onOpen(h.id)} className="block w-full text-left">
                <p className="text-[16px] font-semibold">{h.address.split(",")[0]}</p>
                <p className="mt-1 text-[14px] text-[#5d5b62]">
                  {m.dot && !isPassed && <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[#D9467A] align-[1px]" />}
                  {isPassed ? "Passed." : m.line}
                </p>
              </button>
              {!isPassed && (
                <button onClick={() => onOpen(h.id)} className="mt-3 rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white">
                  {m.action}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {passed.length > 0 && (
        <button onClick={() => setShowPassed((v) => !v)} className="mt-4 text-sm text-[#5d5b62] underline underline-offset-2">
          {showPassed ? "Hide passed homes" : `${passed.length} passed \u00b7 Show`}
        </button>
      )}
    </>
  )
}

function HomePanel({ home, clientFirst, onBack }: { home: HomeView; clientFirst: string; onBack: () => void }) {
  const [state, save, saving] = useActionState<HomeResult | null, FormData>(saveHome, null)
  const [pending, start] = useTransition()
  const m = nextMove(home, clientFirst)
  const [v, setV] = useState({
    showDate: home.showDate,
    showTime: home.showTime,
    agentName: home.agentName,
    agentBrokerage: home.agentBrokerage,
    agentEmail: home.agentEmail,
    agentPhone: home.agentPhone,
    notes: home.notes,
    listingUrl: home.listingUrl,
  })
  const set = (k: keyof typeof v, val: string) => setV((o) => ({ ...o, [k]: val }))


  return (
    <>
        <button onClick={onBack} className="mb-4 text-sm text-[#5d5b62]">&larr; All homes</button>
        <h3 className="pr-12 font-serif text-[26px] leading-tight">{home.address.split(",")[0]}</h3>
        <p className="mt-1 text-sm text-[#5d5b62]">
          {home.address.split(",").slice(1).join(",").trim()}
          {home.listingUrl && (
            <>
              {home.address.includes(",") ? " · " : ""}
              <a href={home.listingUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Open listing
              </a>
            </>
          )}
        </p>

        {home.status === "active" && (
          <div className="mt-5 rounded-2xl border border-[#f0c9d7] bg-[#fdf6f8] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#a3305d]">Next move</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{m.line}</p>
          </div>
        )}

        <form action={save} className="mt-6 space-y-6">
          <input type="hidden" name="homeId" value={home.id} />
          <input type="hidden" name="address" value={home.address} />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">Showing</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" name="showDate" value={v.showDate} onChange={(e) => set("showDate", e.target.value)} className={input} aria-label="Showing date" />
              <input type="time" name="showTime" value={v.showTime} onChange={(e) => set("showTime", e.target.value)} className={input} aria-label="Showing time" />
            </div>
            <p className="mt-1.5 text-xs text-[#8e8c93]">It goes on your calendar too.</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">Listing agent</p>
            <div className="grid grid-cols-2 gap-3">
              <input name="agentName" value={v.agentName} onChange={(e) => set("agentName", e.target.value)} placeholder="Name" className={input} />
              <input name="agentBrokerage" value={v.agentBrokerage} onChange={(e) => set("agentBrokerage", e.target.value)} placeholder="Brokerage" className={input} />
              <input name="agentEmail" type="email" value={v.agentEmail} onChange={(e) => set("agentEmail", e.target.value)} placeholder="Email" className={input} />
              <input name="agentPhone" type="tel" value={v.agentPhone} onChange={(e) => set("agentPhone", e.target.value)} placeholder="Phone" className={input} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">{clientFirst ? `${clientFirst}'s notes` : "Notes"}</p>
            <textarea name="notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Loved the kitchen. Backyard is small." className={input} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">Listing link</p>
            <input name="listingUrl" value={v.listingUrl} onChange={(e) => set("listingUrl", e.target.value)} placeholder="Zillow or listing link" className={input} />
          </div>

          <div className="flex items-center gap-3">
            <button disabled={saving} className="rounded-full bg-ink px-6 py-2.5 text-[15px] font-medium text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
            {state?.message && <span className={`text-sm ${state.ok ? "text-[#1f5b33]" : "text-[#b42318]"}`}>{state.ok ? "✓ " : ""}{state.message}</span>}
          </div>
        </form>

        <div className="mt-8 flex gap-5 border-t border-[#efece8] pt-5 text-sm text-[#5d5b62]">
          <button
            disabled={pending}
            onClick={() => start(() => setHomeStatus(home.id, home.status === "active" ? "passed" : "active"))}
            className="underline underline-offset-2"
          >
            {home.status === "active" ? `${clientFirst || "They"} passed on this home` : "Bring this home back"}
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Remove this home?")) start(async () => { await removeHome(home.id); onBack() })
            }}
            className="underline underline-offset-2"
          >
            Remove
          </button>
        </div>
    </>
  )
}
