"use client"

import { useActionState } from "react"
import { signUp } from "./actions"

export default function SignupForm({ trial }: { trial?: string }) {
  const [state, formAction, pending] = useActionState(signUp, null)
  const v = state?.values

  return (
    <form action={formAction} className="space-y-5">
      {trial && <input type="hidden" name="trial" value={trial} />}
      <Field label="Business name" name="businessName" autoComplete="organization" required defaultValue={v?.businessName ?? ""} />
      <Field label="Your name" name="fullName" autoComplete="name" required defaultValue={v?.fullName ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={v?.email ?? ""} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
      />
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-lxink px-6 py-3 font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating your account\u2026" : "Get started free"}
      </button>
      <p className="text-center text-xs text-lxink/50">No credit card required.</p>
    </form>
  )
}

function Field({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-lxink/70">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
      />
      {hint && <span className="mt-1 block text-xs text-lxink/40">{hint}</span>}
    </label>
  )
}
