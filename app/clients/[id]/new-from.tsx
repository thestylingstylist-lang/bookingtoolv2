"use client"

import { useEffect, useState, useTransition } from "react"
import { markActivitySeen, setFollowUp } from "./activity-actions"

// "New from Kelly": everything the client did since the agent last looked, in full,
// at the top of the jacket. Opening the jacket clears the gold marker, unless she keeps it for follow-up.

export type NewItem = {
  id: string
  kind: "note" | "offer" | "times" | "upload" | "booking"
  detail: string
  when: string // "Today, 2:14 PM"
  homeId: string | null
  homeStreet: string
  fresh: boolean // not seen before this visit
}

const KIND: Record<NewItem["kind"], string> = {
  note: "Note",
  offer: "Offer",
  times: "Showing times",
  upload: "Document",
  booking: "Booked",
}

// Opens the home's panel in the Homes section.
export function openHome(id: string) {
  window.dispatchEvent(new CustomEvent("mb-open-home", { detail: id }))
}

export default function NewFrom({ clientId, first, items: given, followUp }: { clientId: string; first: string; items: NewItem[]; followUp: boolean }) {
  // Held for the whole visit: marking it seen can refresh the page, and what she's reading must stay put.
  const [items] = useState(given)
  const [follow, setFollow] = useState(followUp)
  const [pending, start] = useTransition()
  const unseen = items.some((i) => i.fresh)

  useEffect(() => {
    if (unseen) markActivitySeen(clientId).catch(() => {})
  }, [clientId, unseen])

  if (!items.length) return null
  const who = first || "your client"

  return (
    <section aria-label={`New from ${who}`} className={`border-b border-lxhair px-5 py-5 sm:px-6 ${unseen || follow ? "bg-[#FBF8F2]" : "bg-white"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
          {(unseen || follow) && <span className="h-[8px] w-[8px] rounded-full bg-lxgold" aria-hidden="true" />}
          {unseen ? `New from ${who}` : follow ? `Following up with ${who}` : `Recent from ${who}`}
        </h2>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setFollowUp(clientId, !follow)
              if (r.ok) setFollow(!follow)
            })
          }
          className="text-[13px] text-lxink [border-bottom:1px_solid_#C2A46B] disabled:opacity-50"
        >
          {follow ? "Done following up" : "Keep for follow-up"}
        </button>
      </div>
      <ul className="mt-3 divide-y divide-lxhair border-y border-lxhair">
        {items.map((i) => (
          <li key={i.id} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-5">
            <div className="shrink-0 text-[11.5px] uppercase tracking-[.12em] text-lxsoft sm:w-[132px] sm:pt-[3px]">
              {i.fresh && <span className="mr-1.5 inline-block h-[6px] w-[6px] rounded-full bg-lxgold align-[1px]" aria-label="New" />}
              {KIND[i.kind]}
            </div>
            <div className="min-w-0 flex-1">
              {i.homeId && i.homeStreet && (
                <button
                  type="button"
                  onClick={() => openHome(i.homeId!)}
                  className="mb-1 text-left text-[14.5px] font-semibold text-lxink underline-offset-4 hover:underline"
                >
                  {i.homeStreet}
                </button>
              )}
              <p className="m-0 whitespace-pre-wrap text-[15px] leading-[1.55] text-lxink">{i.kind === "note" ? `“${i.detail}”` : i.detail}</p>
              <p className="m-0 mt-1 text-[12px] text-lxsoft">{i.when}</p>
            </div>
          </li>
        ))}
      </ul>
      {!follow && unseen && <p className="m-0 mt-2.5 text-[12px] text-lxsoft">Seen now. {first ? `${first}\u2019s` : "Their"} jacket goes back to its usual place unless you keep it for follow-up.</p>}
    </section>
  )
}
