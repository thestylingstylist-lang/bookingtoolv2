"use client"
import { useActionState, useState } from "react"
import { applyPartner, type ApplyState } from "./actions"

const field = "w-full rounded-xl border border-[#16151a]/12 bg-white px-4 py-3 text-[15px] outline-none placeholder:text-[#9a989e] focus:border-[#BC559E]"
const label = "mb-1.5 block text-[13px] font-medium text-[#55535b]"

export default function ApplyForm() {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyPartner, null)
  const [kind, setKind] = useState("influencer")

  if (state?.ok)
    return (
      <div className="mt-8 rounded-3xl border border-[#EBC9E0] bg-[#FBEDF5] p-8 text-center">
        <p className="text-xl font-semibold tracking-tight">You&rsquo;re on the list.</p>
        <p className="mt-2 text-[15px] text-[#55535b]">{state.message}</p>
      </div>
    )

  return (
    <form action={action} className="mt-8 flex flex-col gap-5 rounded-3xl border border-[#16151a]/8 bg-white/85 p-6 shadow-[0_40px_80px_-50px_rgba(22,21,26,.35)] sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className={label}>Your name</span>
          <input name="name" required autoComplete="name" className={field} placeholder="Dana Lee" />
        </label>
        <label>
          <span className={label}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} placeholder="you@email.com" />
        </label>
      </div>
      <div>
        <span className={label}>I&rsquo;m a</span>
        <input type="hidden" name="kind" value={kind} />
        <div className="flex flex-wrap gap-2">
          {[
            ["influencer", "Agent influencer"],
            ["coach", "Real estate coach"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setKind(v)}
              aria-pressed={kind === v}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                kind === v ? "border-[#BC559E] bg-[#FBEDF5] text-[#16151a]" : "border-[#16151a]/12 text-[#55535b] hover:bg-[#f6f5f3]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className={label}>Where would you share Marvberry?</span>
        <input name="audience" required className={field} placeholder="Your Instagram, YouTube, coaching group or brokerage" />
      </label>
      <label>
        <span className={label}>How would you share it? (optional)</span>
        <textarea name="pitch" rows={3} className={`${field} resize-y`} placeholder="A post, a training, a newsletter..." />
      </label>
      <label className="flex items-start gap-3 text-[14px] text-[#55535b]">
        <input type="checkbox" name="agree" className="mt-1 h-4 w-4 accent-[#BC559E]" />
        <span>
          I agree to the <a href="#terms" className="border-b border-[#BC559E] text-[#16151a]">partner terms</a>, including
          saying it&rsquo;s an affiliate link when I share it.
        </span>
      </label>
      {state && !state.ok && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>}
      <button disabled={pending} className="self-start rounded-full bg-[#16151a] px-7 py-3.5 text-[15px] font-medium text-white disabled:opacity-60">
        {pending ? "Sending…" : "Apply"}
      </button>
    </form>
  )
}
