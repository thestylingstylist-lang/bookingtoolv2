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
          <span className="mb-1.5 block text-sm text-lxink/70">First name</span>
          <input
            name="firstName"
            defaultValue={firstName}
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-lxink/70">Last name</span>
          <input
            name="lastName"
            defaultValue={lastName}
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-lxink/70">Email address</span>
        <input
          value={email}
          readOnly
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-lxink/10 bg-lxink/5 px-4 py-3 text-lxink/60 outline-none"
        />
        <span className="mt-1.5 block text-xs text-lxink/50">
          Your new-booking alerts go here. It&rsquo;s also the email you sign
          in with. Need to change it? Contact support.
        </span>
      </label>

      {state && (
        <p
          role="status"
          className={
            "rounded-lg px-4 py-3 text-sm " +
            (state.ok ? "bg-lxgold/15 text-lxink/80" : "bg-red-50 text-red-800")
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-lxink px-6 py-3 font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save account"}
      </button>
    </form>
  )
}
