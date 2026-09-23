"use client"

import { useActionState } from "react"
import { requestReset } from "./actions"

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestReset, null)

  if (state?.sent) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white/60 p-6">
        <p className="font-medium">Check your email.</p>
        <p className="mt-2 text-sm text-ink/70">
          If there&rsquo;s an account for that address, a reset link is on its way. Open it on this
          same device and browser. It can take a few minutes, so check spam too.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending\u2026" : "Send reset link"}
      </button>
    </form>
  )
}
