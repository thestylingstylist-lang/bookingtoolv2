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
  const [openId, setOpenId] = useState<string | null>(null)
  const [showPassed, setShowPassed] = useState(false)
  const [state, add, adding] = useActionState<HomeResult | null, FormData>(addHome, null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  const active = homes.filter((h) => h.status === "active")
  const passed = homes.filter((h) => h.status === "passed")
  const list = showPassed ? [...active, ...passed] : active
  const open = homes.find((h) => h.id === openId) ?? null

  return (
    <section className="border-b border-[#e4e3e0] bg-white px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Homes</h2>
        {homes.length > 0 && (
          <p className="text-[13px] text-[#5d5b62]">
            {active.length} {active.length === 1 ? "home" : "homes"}
            {passed.length > 0 && (
              <>
                {" "}
                &middot; {passed.length} passed &middot;{" "}
                <button onClick={() => setShowPassed((v) => !v)} className="underline underline-offset-2">
                  {showPassed ? "Hide" : "Show"}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <form ref={formRef} action={add} className="mt-3 flex items-center gap-2 rounded-xl border border-[#e4e3e0] bg-white p-1.5 pl-4">
        <input type="hidden" name="clientId" value={clientId} />
        <input
          name="home"
          placeholder="Paste a Zillow link or an address"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-[#aaa6a0]"
        />
        <button disabled={adding} className="shrink-0 rounded-lg bg-[#f1f0ee] px-4 py-2 text-sm font-medium disabled:opacity-60">
          {adding ? "Adding…" : "Add home"}
        </button>
      </form>
      {state && !state.ok && <p className="mt-2 text-sm text-[#b42318]">{state.message}</p>}

      {list.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {list.map((h) => {
            const m = nextMove(h, clientFirst)
            const isPassed = h.status === "passed"
            return (
              <div
                key={h.id}
                className={`flex w-[300px] shrink-0 flex-col justify-between rounded-2xl border border-[#e4e3e0] bg-white p-4 ${isPassed ? "opacity-60" : ""}`}
              >
                <button onClick={() => setOpenId(h.id)} className="text-left">
                  <p className="truncate text-[15.5px] font-semibold">{h.address.split(",")[0]}</p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] text-[#5d5b62]">
                    {m.dot && !isPassed && <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[#D9467A] align-[1px]" />}
                    {isPassed ? "Passed." : m.line}
                  </p>
                </button>
                {!isPassed && (
                  <button
                    onClick={() => setOpenId(h.id)}
                    className="mt-3 self-start rounded-full bg-ink px-4 py-2 text-[13.5px] font-medium text-white"
                  >
                    {m.action}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && <HomePanel key={open.id} home={open} clientFirst={clientFirst} onClose={() => setOpenId(null)} />}
    </section>
  )
}

function HomePanel({ home, clientFirst, onClose }: { home: HomeView; clientFirst: string; onClose: () => void }) {
  const [state, save, saving] = useActionState<HomeResult | null, FormData>(saveHome, null)
  const [pending, start] = useTransition()
  const m = nextMove(home, clientFirst)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-[#16151a]/30" />
      <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto bg-white px-6 py-6 shadow-2xl sm:w-[480px] sm:px-8">
        <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f0ee] text-[#5d5b62]">
          &#x2715;
        </button>

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
              <input type="date" name="showDate" defaultValue={home.showDate} className={input} aria-label="Showing date" />
              <input type="time" name="showTime" defaultValue={home.showTime} step={900} className={input} aria-label="Showing time" />
            </div>
            <p className="mt-1.5 text-xs text-[#8e8c93]">It goes on your calendar too.</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">Listing agent</p>
            <div className="grid grid-cols-2 gap-3">
              <input name="agentName" defaultValue={home.agentName} placeholder="Name" className={input} />
              <input name="agentBrokerage" defaultValue={home.agentBrokerage} placeholder="Brokerage" className={input} />
              <input name="agentEmail" type="email" defaultValue={home.agentEmail} placeholder="Email" className={input} />
              <input name="agentPhone" type="tel" defaultValue={home.agentPhone} placeholder="Phone" className={input} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">{clientFirst ? `${clientFirst}'s notes` : "Notes"}</p>
            <textarea name="notes" rows={3} defaultValue={home.notes} placeholder="Loved the kitchen. Backyard is small." className={input} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[.14em] text-[#8e8c93]">Listing link</p>
            <input name="listingUrl" defaultValue={home.listingUrl} placeholder="Zillow or listing link" className={input} />
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
              if (confirm("Remove this home?")) start(async () => { await removeHome(home.id); onClose() })
            }}
            className="underline underline-offset-2"
          >
            Remove
          </button>
        </div>
      </aside>
    </div>
  )
}
