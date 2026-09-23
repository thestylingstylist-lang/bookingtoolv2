"use client"

import { useActionState } from "react"
import { saveAccount, type SettingsResult } from "./actions"

export default function AccountForm({
  firstName,
  lastName,
  email,
}: {
  firstName: string
  lastName: string
  email: string
}) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(
    saveAccount,
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">First name</span>
          <input
            name="firstName"
            defaultValue={firstName}
            className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">Last name</span>
          <input
            name="lastName"
            defaultValue={lastName}
            className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">Email address</span>
        <input
          value={email}
          readOnly
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 text-ink/60 outline-none"
        />
        <span className="mt-1.5 block text-xs text-ink/50">
          This is how we&rsquo;ll reach you and the email you sign in with. Need
          to change it? Contact support.
        </span>
      </label>

      {state && (
        <p
          role="status"
          className={
            "rounded-lg px-4 py-3 text-sm " +
            (state.ok ? "bg-sage/15 text-ink/80" : "bg-red-50 text-red-800")
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save account"}
      </button>
    </form>
  )
}
