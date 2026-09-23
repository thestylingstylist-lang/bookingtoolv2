"use client"

import { useActionState } from "react"
import { setNewPassword } from "./actions"

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"

export default function ResetForm() {
  const [state, formAction, pending] = useActionState(setNewPassword, null)

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">New password</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">Confirm new password</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
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
        {pending ? "Saving\u2026" : "Save new password"}
      </button>
    </form>
  )
}
