"use client"

import { useActionState, useState } from "react"
import { saveClientNotes, askForOffer, type PortalHomeResult } from "./home-actions"

export type PortalHome = {
  id: string
  street: string
  town: string
  listingUrl: string
  showing: string // "Friday, Oct 23 at 4 PM", or ""
  shown: boolean
  notes: string
  askedLabel: string // "Tuesday" when they tapped the offer button, or ""
  offer: { amount: string; sentLabel: string; status: "sent" | "countered" | "accepted" | "declined" } | null
}

// The client's homes: when they're seeing each one, their own notes,
// and a way to say "I'd like to make an offer" whenever they decide.
export default function PortalHomes({ token, homes, agentFirst }: { token: string; homes: PortalHome[]; agentFirst: string }) {
  return (
    <div className="rounded-xl border border-[#e4e3e0] bg-white px-4 py-3.5">
      <h2 className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.09em] text-[#5d5b62]">Homes for you</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {homes.map((h) => (
          <HomeRow key={h.id} token={token} home={h} agentFirst={agentFirst} />
        ))}
      </div>
    </div>
  )
}

function HomeRow({ token, home: h, agentFirst }: { token: string; home: PortalHome; agentFirst: string }) {
  const [noteState, saveNotes, saving] = useActionState<PortalHomeResult | null, FormData>(saveClientNotes, null)
  const [askState, ask, asking] = useActionState<PortalHomeResult | null, FormData>(askForOffer, null)
  const [confirm, setConfirm] = useState(false)
  const [notes, setNotes] = useState(h.notes)
  const [openNotes, setOpenNotes] = useState(!!h.notes)
  const asked = !!h.askedLabel || !!askState?.ok

  return (
    <div className="flex flex-col rounded-[11px] border border-[#e4e3e0] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[19px] font-semibold leading-snug tracking-tight">{h.street}</p>
          {h.town && <p className="text-[12.5px] text-[#5d5b62]">{h.town}</p>}
        </div>
        {h.listingUrl && (
          <a href={h.listingUrl} target="_blank" rel="noreferrer" className="shrink-0 pt-1 text-[12.5px] text-[#5d5b62] underline underline-offset-2">
            See the listing
          </a>
        )}
      </div>

      <p className="mt-1.5 text-[13.5px]">
        {h.showing ? (h.shown ? `You saw it ${h.showing.replace(/ at .*/, "")}.` : `Showing ${h.showing}.`) : `${agentFirst} is setting up the showing.`}
      </p>

      {/* Where the offer stands */}
      <div className="mt-3 flex-1">
        {h.offer ? (
          <OfferLine offer={h.offer} agentFirst={agentFirst} />
        ) : asked ? (
          <p className="rounded-[9px] bg-[#e5f1f0] px-3 py-2 text-[13px] text-[#2f7f7e]">
            You asked for an offer{h.askedLabel ? ` ${h.askedLabel}` : ""}. {agentFirst} has it and will put it together with you.
          </p>
        ) : confirm ? (
          <form action={ask} className="rounded-[9px] border border-[#e4e3e0] bg-[#f7f6f4] px-3 py-2.5">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="homeId" value={h.id} />
            <p className="text-[13px]">
              We&rsquo;ll let {agentFirst} know right away. Nothing goes to the seller until you two talk it through.
            </p>
            <div className="mt-2 flex gap-2">
              <button disabled={asking} className="rounded-[9px] bg-[#16151a] px-[15px] py-2 text-[13px] font-medium text-white disabled:opacity-60">
                {asking ? "Sending…" : `Tell ${agentFirst}`}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="rounded-[9px] px-3 py-2 text-[13px] text-[#5d5b62]">
                Not yet
              </button>
            </div>
            {askState && !askState.ok && <p className="mt-2 text-xs text-red-800">{askState.message}</p>}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="rounded-[9px] bg-[#16151a] px-[15px] py-2 text-[13px] font-medium text-white"
          >
            I&rsquo;d like to make an offer
          </button>
        )}
      </div>

      {/* Their own notes */}
      {openNotes ? (
        <form action={saveNotes} className="mt-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="homeId" value={h.id} />
          <label className="mb-1 block text-[12px] text-[#5d5b62]">Your notes. Only you and {agentFirst} see these.</label>
          <textarea
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you love? What would you change?"
            className="w-full resize-y rounded-[9px] border border-[#e4e3e0] bg-[#f1f0ee] px-3 py-2 text-[13.5px] outline-none placeholder:text-[#9a989e] focus:bg-white"
          />
          <div className="mt-1.5 flex items-center gap-3">
            <button disabled={saving} className="rounded-[9px] border border-[#e4e3e0] px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-60">
              {saving ? "Saving…" : "Save notes"}
            </button>
            {noteState && (
              <span className={`text-[12px] ${noteState.ok ? "text-[#2f7f7e]" : "text-red-800"}`}>{noteState.message}</span>
            )}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpenNotes(true)} className="mt-3 self-start text-[12.5px] text-[#5d5b62] underline underline-offset-2">
          Add your notes
        </button>
      )}
    </div>
  )
}

function OfferLine({ offer: o, agentFirst }: { offer: NonNullable<PortalHome["offer"]>; agentFirst: string }) {
  const tone = "rounded-[9px] px-3 py-2 text-[13px]"
  if (o.status === "accepted")
    return <p className={`${tone} bg-[#e5f1f0] font-medium text-[#2f7f7e]`}>Your offer of {o.amount} was accepted.</p>
  if (o.status === "countered")
    return (
      <p className={`${tone} bg-[#fdf1f5] text-[#a3305d]`}>
        The seller came back with a counter to your {o.amount} offer. {agentFirst} will walk you through it.
      </p>
    )
  if (o.status === "declined")
    return (
      <p className={`${tone} bg-[#f1f0ee] text-[#5d5b62]`}>
        The seller passed on your {o.amount} offer. Talk with {agentFirst} about what&rsquo;s next.
      </p>
    )
  return (
    <p className={`${tone} bg-[#e5f1f0] text-[#2f7f7e]`}>
      <span className="font-medium">Offer sent {o.sentLabel}.</span> {agentFirst} sent your offer of {o.amount} to the listing agent.
    </p>
  )
}
