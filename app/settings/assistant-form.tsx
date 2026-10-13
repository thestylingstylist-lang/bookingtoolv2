"use client"

import { useActionState, useState } from "react"
import type { SettingsResult } from "./actions"
import { saveAssistant } from "./assistant-actions"

const choice = (on: boolean) =>
  "block cursor-pointer rounded-xl border px-4 py-3 transition-colors " +
  (on ? "border-ink bg-white" : "border-ink/15 bg-white/50 hover:border-ink/40")

export default function AssistantForm({
  unlocked,
  auto: startAuto,
  voice,
}: {
  unlocked: boolean
  auto: boolean
  voice: string
}) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(saveAssistant, null)
  const [auto, setAuto] = useState(startAuto)

  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-card p-5">
        <p className="text-sm leading-relaxed text-ink/70">
          Marvberry Assistant writes your client reminders and replies in your voice, so every client hears from you
          on time. It comes with the Marvberry Assistant plan.
        </p>
        <a
          href="/support"
          className="mt-4 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
        >
          Ask us about it
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2.5">
        <span className="mb-1 block text-sm text-ink/70">How your messages go out</span>
        <label className={choice(!auto)}>
          <input type="radio" name="mode" value="approve" checked={!auto} onChange={() => setAuto(false)} className="sr-only" />
          <span className="block text-sm font-medium text-ink">I&rsquo;ll read every message first</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
            The assistant drafts. You read it, edit anything, and send. Recommended.
          </span>
        </label>
        <label className={choice(auto)}>
          <input type="radio" name="mode" value="auto" checked={auto} onChange={() => setAuto(true)} className="sr-only" />
          <span className="block text-sm font-medium text-ink">Send reminders for me</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
            When something your client owes comes due, the reminder goes out on its own, in your name, once each
            morning. Replies to your clients still wait for you.
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">A few messages you&rsquo;ve written</span>
        <textarea
          name="voice"
          rows={7}
          defaultValue={voice}
          placeholder={"Paste two or three texts or emails you've sent clients. Leave a blank line between each one."}
          className="w-full resize-y rounded-xl border border-ink/15 bg-white/70 px-4 py-3 text-sm leading-relaxed outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
        />
        <span className="mt-1.5 block text-xs text-ink/50">
          The assistant learns how you sound from these and from the messages you send in Marvberry. Your clients
          never see this.
        </span>
      </label>

      {state && (
        <p
          role="status"
          className={"rounded-lg px-4 py-3 text-sm " + (state.ok ? "bg-sage/15 text-ink/80" : "bg-red-50 text-red-800")}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ox px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save assistant"}
      </button>
    </form>
  )
}
