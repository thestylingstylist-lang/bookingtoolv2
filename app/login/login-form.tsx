"use client"

import { useActionState, useState } from "react"
import { signIn } from "./actions"

const field =
  "w-full rounded-lg border-2 border-[#e0d6c2] bg-white px-5 py-4 text-base text-black placeholder:text-black/50 outline-none focus:border-[#c9b994]"

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null)
  const [show, setShow] = useState(false)

  return (
    <form action={formAction} className="space-y-6">
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Email"
        aria-label="Email"
        className={field}
      />
      <div className="relative">
        <input
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          placeholder="Password"
          aria-label="Password"
          className={`${field} pr-14`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
        >
          {show ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.3M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              <path d="M2 2l20 20" />
            </svg>
          )}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-black px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Logging in\u2026" : "Log In"}
      </button>
      <div className="space-y-3 pt-2 text-center text-sm text-black/60">
        <a href="/forgot-password" className="block underline underline-offset-4 hover:text-black">
          Forgot Password?
        </a>
        <p>
          No account yet?{" "}
          <a href="/signup" className="underline underline-offset-4 hover:text-black">
            Create one
          </a>
        </p>
      </div>
    </form>
  )
}
