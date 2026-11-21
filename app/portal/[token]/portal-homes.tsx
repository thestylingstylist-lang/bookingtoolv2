"use client"

import { useActionState, useState } from "react"
import { saveClientNotes, askForOffer, type PortalHomeResult } from "./home-actions"
import { H2, OUTLINE, QUIET, BTN, Tag } from "../../suite-ui"

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
    <section id="homes">
      <H2 className="mb-6">Homes selected for you</H2>
      <div className="grid gap-10 md:grid-cols-3 md:gap-0">
        {homes.map((h, i) => (
          <div key={h.id} className={`md:pr-7 ${i % 3 !== 2 ? "md:mr-7 md:border-r md:border-[rgba(31,30,28,.09)]" : ""}`}>
            <HomeRow token={token} home={h} agentFirst={agentFirst} />
          </div>
        ))}
      </div>
    </section>
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
    <article className="flex flex-col font-luxsans text-lxink">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 font-lux text-[28px] font-light leading-[1.1]">{h.street}</p>
        {h.offer?.status === "accepted" && <Tag color="sage">Offer accepted</Tag>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] text-lxsoft">{h.town}</span>
        {h.listingUrl && (
          <a href={h.listingUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-lxink no-underline [border-bottom:1px_solid_#C2A46B]">
            View the listing
          </a>
        )}
      </div>

      <p className="m-0 mt-[18px] text-[14px]">
        {h.showing ? (h.shown ? `You visited ${h.showing.replace(/ at .*/, "")}.` : `You\u2019ll see it ${h.showing}.`) : "I\u2019m arranging your showing."}
      </p>

      {/* Where the offer stands */}
      <div className="mt-[18px]">
        {h.offer ? (
          <OfferLine offer={h.offer} agentFirst={agentFirst} />
        ) : asked ? (
          <p className="m-0 text-[14px] text-lxsoft">Thank you. I&rsquo;ll prepare your offer with you.</p>
        ) : confirm ? (
          <form action={ask}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="homeId" value={h.id} />
            <p className="m-0 text-[14px]">I&rsquo;ll start on it right away.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button disabled={asking} className={BTN}>
                {asking ? "Sending\u2026" : `Tell ${agentFirst}`}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={QUIET}>
                Not yet
              </button>
            </div>
            {askState && !askState.ok && <p className="mt-2 text-xs text-red-800">{askState.message}</p>}
          </form>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className={OUTLINE}>
            I&rsquo;d like to make an offer
          </button>
        )}
      </div>

      {/* Their own notes */}
      {openNotes ? (
        <form action={saveNotes} className="mt-[22px]">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="homeId" value={h.id} />
          <label className="block text-[12px] text-lxsoft">
            Your private notes. Only you and {agentFirst} can see them.
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you love? What would you change?"
              className="mt-2 block w-full resize-y border-0 border-b border-[rgba(194,164,107,.55)] bg-transparent px-0 py-1.5 font-lux text-[17px] italic text-lxink outline-none placeholder:text-[#a5a19a]"
            />
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <button disabled={saving} className={QUIET}>
              {saving ? "Saving\u2026" : "Save notes"}
            </button>
            {noteState && <span className={`text-[12px] ${noteState.ok ? "text-lxsoft" : "text-red-800"}`}>{noteState.message}</span>}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpenNotes(true)} className={`${QUIET} mt-[18px] self-start`}>
          Add a private note
        </button>
      )}
    </article>
  )
}

function OfferLine({ offer: o }: { offer: NonNullable<PortalHome["offer"]>; agentFirst: string }) {
  const tone = "m-0 text-[14px] leading-relaxed"
  if (o.status === "accepted") return <p className={tone}>Your {o.amount} offer was accepted. Congratulations.</p>
  if (o.status === "countered")
    return <p className={tone}>The seller countered your {o.amount} offer. Let&rsquo;s talk it through.</p>
  if (o.status === "declined")
    return <p className={`${tone} text-lxsoft`}>The seller passed on your {o.amount} offer. Let&rsquo;s talk about what&rsquo;s next.</p>
  return <p className={tone}>I sent your offer of {o.amount} on {o.sentLabel}.</p>
}
