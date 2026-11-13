"use client"

import { useActionState } from "react"
import { claimCard, type ClaimState } from "./actions"

export default function ClaimForm() {
  const [state, action, pending] = useActionState<ClaimState | null, FormData>(claimCard, null)
  return (
    <form action={action} className="cf">
      <input name="fullName" placeholder="Your name" autoComplete="name" defaultValue={state?.values.fullName} required />
      <input name="email" type="email" placeholder="Email" autoComplete="email" defaultValue={state?.values.email} required />
      <input name="password" type="password" placeholder="Create a password" autoComplete="new-password" minLength={8} required />
      {state?.error && <p className="err">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Making your card…" : "Claim my card"}</button>
      <p className="fine">Free. No credit card, and no trial clock. Already have an account? <a href="/login">Sign in</a></p>
    </form>
  )
}
