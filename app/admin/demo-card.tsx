"use client"
import { useActionState } from "react"
import { createDemo, type DemoState } from "./demo-actions"

// One click builds a clean demo login for sales demos. Run it again any time to reset it.
export default function DemoCard() {
  const [state, action, pending] = useActionState<DemoState, FormData>(createDemo, null)
  return (
    <section className="mt-8 rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold tracking-tight">Demo account</h2>
          <p className="mt-1 text-sm text-[#16151a]/60">
            A clean agent, Nicole Bennett, with four clients at different stages, upcoming bookings, a signed agreement,
            an offer out, and a client waiting on a reply. Everything is made up. Running it again resets it with a new
            password.
          </p>
        </div>
        <form
          action={action}
          onSubmit={(e) => {
            if (state?.ok && !confirm("Reset the demo account? It starts fresh with a new password.")) e.preventDefault()
          }}
        >
          <button disabled={pending} className="rounded-full bg-[#16151a] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {pending ? "Building…" : state?.ok ? "Reset demo account" : "Create demo account"}
          </button>
        </form>
      </div>
      {state && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${state.ok ? "bg-[#FBEDF5]" : "bg-red-50 text-red-800"}`}>
          <p className="font-medium">{state.message}</p>
          {state.ok && (
            <div className="mt-2 grid gap-1">
              <p>Log in at marvberry.com/login</p>
              <p>Email: <code className="select-all">demo@marvberry.com</code></p>
              <p>Password: <code className="select-all font-semibold">{state.password}</code> <span className="text-[#16151a]/50">(save it now, it won&rsquo;t show again)</span></p>
              <p>Booking page: <a className="underline" href={`/book/${state.slug}`} target="_blank" rel="noreferrer">marvberry.com/book/{state.slug}</a></p>
              {!!state.problems?.length && <p className="mt-1 text-[#93407A]">Didn&rsquo;t load: {state.problems.join(", ")}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
