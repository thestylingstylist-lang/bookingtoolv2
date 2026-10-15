"use client"

import { useFormStatus } from "react-dom"

// A button that says "Sending…" while its form is on its way, so you know the click landed.
export default function SubmitButton({
  children,
  pendingLabel = "Sending…",
  className,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  )
}
