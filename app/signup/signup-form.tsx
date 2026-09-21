"use client"

import { useActionState } from "react"
import { signUp } from "./actions"

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, null)
  const v = state?.values

  return (
    <form action={formAction} className="space-y-5">
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
        className="w-full rounded-xl bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating your account\u2026" : "Get started free"}
      </button>
      <p className="text-center text-xs text-ink/50">No credit card required.</p>
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
      <span className="mb-1.5 block text-sm text-ink/70">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
      />
      {hint && <span className="mt-1 block text-xs text-ink/40">{hint}</span>}
    </label>
  )
}
