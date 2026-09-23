"use client"

import { useActionState } from "react"
import { signIn } from "./actions"

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null)

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
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-ink/15 bg-white/70 px-4 py-3 outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
        />
        <a href="/forgot-password" className="mt-2 inline-block text-sm font-medium text-brass hover:underline">
          Forgot password?
        </a>
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
        {pending ? "Signing in\u2026" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink/60">
        No account yet?{" "}
        <a href="/signup" className="font-medium text-brass hover:underline">
          Create one
        </a>
      </p>
    </form>
  )
}
