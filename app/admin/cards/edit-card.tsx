"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import GiftForm, { type GiftValues } from "./gift-form"

export default function EditCard({ card }: { card: GiftValues }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="underline underline-offset-4">
        Edit
      </button>
    )
  return (
    <div className="mt-3 w-full basis-full rounded-xl bg-[#F8F8F8] p-4">
      <GiftForm
        card={card}
        onDone={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
