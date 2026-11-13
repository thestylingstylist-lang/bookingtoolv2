"use client"

import { useActionState } from "react"
import { claimGift, type ClaimGiftState } from "./actions"

export default function ClaimGiftForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<ClaimGiftState | null, FormData>(claimGift.bind(null, token), null)
  return (
    <form action={action} className="cf">
      <input name="email" type="email" placeholder="Your email" autoComplete="email" defaultValue={state?.email ?? email} required />
      <input name="password" type="password" placeholder="Create a password" autoComplete="new-password" minLength={8} required />
      {state?.error && <p className="err">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Claiming…" : "Claim my card"}</button>
      <p className="fine">Free. No credit card, and no trial clock.</p>
    </form>
  )
}
