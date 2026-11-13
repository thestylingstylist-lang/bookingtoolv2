"use client"

import { useActionState, useEffect, useRef } from "react"
import { createGiftCard, updateGiftCard } from "./actions"

const F = "w-full rounded-xl border border-[#e6e5e3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#BC559E]"

export type GiftValues = {
  id: string
  fullName: string
  brokerage: string
  tagline: string
  areas: string
  instagram: string
  website: string
  phone: string
  officePhone: string
  email: string
  address: string
}

// Makes a new gift card, or edits one when `card` is given.
export default function GiftForm({ card, onDone }: { card?: GiftValues; onDone?: () => void }) {
  const [state, action, pending] = useActionState<{ error: string } | null, FormData>(card ? updateGiftCard.bind(null, card.id) : createGiftCard, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state && !state.error) {
      if (card) onDone?.()
      else ref.current?.reset()
    }
  }, [state, card, onDone])
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="fullName" defaultValue={card?.fullName} placeholder="Her name" className={F} required />
      <input name="brokerage" defaultValue={card?.brokerage} placeholder="Brokerage" className={F} />
      <input name="tagline" defaultValue={card?.tagline} placeholder="Tagline. Use | for two lines: Real estate, | with you every step of the way." className={`${F} sm:col-span-2`} />
      <input name="areas" defaultValue={card?.areas} placeholder="Areas (Princeton)" className={F} />
      <input name="instagram" defaultValue={card?.instagram} placeholder="Instagram handle" className={F} />
      <input name="website" defaultValue={card?.website} placeholder="Zillow or website link" className={`${F} sm:col-span-2`} />
      <input name="phone" defaultValue={card?.phone} placeholder="Cell" className={F} />
      <input name="officePhone" defaultValue={card?.officePhone} placeholder="Office phone" className={F} />
      <input name="email" defaultValue={card?.email} placeholder="Email" className={F} />
      <textarea name="address" defaultValue={card?.address} placeholder="Office address" rows={2} className={`${F} resize-none`} />
      <label className="flex items-center gap-3 text-[13.5px] text-[#55535b] sm:col-span-2">
        {card ? "New photo (optional)" : "Photo"}
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="text-[13px]" />
      </label>
      {state?.error && <p className="text-[13px] text-[#b3261e] sm:col-span-2">{state.error}</p>}
      {state && !state.error && !card && <p className="text-[13px] text-[#2f7a4f] sm:col-span-2">Card made. It’s in the list below.</p>}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-full bg-[#16151a] px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60">
          {pending ? (card ? "Saving…" : "Making the card…") : card ? "Save changes" : "Make her card"}
        </button>
        {card && (
          <button type="button" onClick={onDone} className="rounded-full bg-[#EEEEF1] px-5 py-2.5 text-[13px] font-medium text-[#16151a]">Close</button>
        )}
      </div>
    </form>
  )
}
