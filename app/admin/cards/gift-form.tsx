"use client"

import { useActionState, useEffect, useRef } from "react"
import { createGiftCard } from "./actions"

const F = "w-full rounded-xl border border-[#e6e5e3] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#BC559E]"

export default function GiftForm() {
  const [state, action, pending] = useActionState<{ error: string } | null, FormData>(createGiftCard, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state && !state.error) ref.current?.reset()
  }, [state])
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="fullName" placeholder="Her name" className={F} required />
      <input name="brokerage" placeholder="Brokerage" className={F} />
      <input name="tagline" placeholder="Tagline. Use | for two lines: Real estate, | with you every step of the way." className={`${F} sm:col-span-2`} />
      <input name="areas" placeholder="Areas (Princeton)" className={F} />
      <input name="instagram" placeholder="Instagram handle" className={F} />
      <input name="website" placeholder="Zillow or website link" className={`${F} sm:col-span-2`} />
      <input name="phone" placeholder="Cell" className={F} />
      <input name="officePhone" placeholder="Office phone" className={F} />
      <input name="email" placeholder="Email" className={F} />
      <textarea name="address" placeholder="Office address" rows={2} className={`${F} resize-none`} />
      <label className="flex items-center gap-3 text-[13.5px] text-[#55535b] sm:col-span-2">
        Photo
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="text-[13px]" />
      </label>
      {state?.error && <p className="text-[13px] text-[#b3261e] sm:col-span-2">{state.error}</p>}
      {state && !state.error && <p className="text-[13px] text-[#2f7a4f] sm:col-span-2">Card made. It’s in the list below.</p>}
      <button disabled={pending} className="justify-self-start rounded-full bg-[#16151a] px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-60">
        {pending ? "Making the card…" : "Make her card"}
      </button>
    </form>
  )
}
