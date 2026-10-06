"use client"

import { useActionState, useState } from "react"
import { signIn } from "./actions"

const field =
  "w-full rounded-xl border border-[#e6ddce] bg-white px-4 py-3 text-base text-[#2b2520] outline-none transition-colors focus:border-[#b89250] focus:ring-2 focus:ring-[#b89250]/15"
const label = "mb-1.5 block text-[13px] text-[#8a8072]"

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null)
  const [show, setShow] = useState(false)

  return (
    <form action={formAction} className="space-y-5">
      <div>
      <label htmlFor="email" className={label}>Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={field}
      />
      </div>
      <div>
      <label htmlFor="password" className={label}>Password</label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className={`${field} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a8072] hover:text-[#2b2520]"
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
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="!mt-7 w-full rounded-xl bg-[#16151a] px-6 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Logging in\u2026" : "Log in"}
      </button>
      <div className="space-y-2.5 pt-1 text-center text-sm text-[#8a8072]">
        <a href="/forgot-password" className="block underline underline-offset-4 hover:text-[#2b2520]">
          Forgot your password?
        </a>
        <p>
          No account yet?{" "}
          <a href="/signup" className="text-[#2b2520] underline underline-offset-4">
            Create one
          </a>
        </p>
      </div>
    </form>
  )
}
