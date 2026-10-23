"use client"

import { useActionState, useState } from "react"
import type { SettingsResult } from "./actions"
import { saveAssistant } from "./assistant-actions"
import type { AiPrefs } from "@/lib/ai-prefs"

// One switch per thing Marvberry AI does, with one plain line under it.
function Switch({
  name,
  title,
  line,
  checked,
  onChange,
  locked,
  children,
}: {
  name: string
  title: string
  line: string
  checked: boolean
  onChange: (v: boolean) => void
  locked?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="py-4">
      <label className={`flex items-start gap-4 ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          name={name}
          checked={checked && !locked}
          disabled={locked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked && !locked ? "bg-ink" : "bg-ink/15"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked && !locked ? "left-[22px]" : "left-0.5"}`}
          />
        </span>
        <span>
          <span className="block text-[15px] font-medium text-ink">{title}</span>
          <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink/60">{line}</span>
        </span>
      </label>
      {children && checked && !locked && <div className="ml-[60px] mt-3">{children}</div>}
    </div>
  )
}

const group = "border-t border-ink/10 pt-5 first:border-0 first:pt-0"
const groupTitle = "text-[13px] font-semibold uppercase tracking-[.12em] text-ink/45"

export default function AssistantForm({
  unlocked,
  auto: startAuto,
  voice,
  prefs,
}: {
  unlocked: boolean
  auto: boolean
  voice: string
  prefs: AiPrefs
}) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(saveAssistant, null)
  const [v, setV] = useState({ ...prefs, auto: startAuto })
  const set = (k: keyof typeof v) => (on: boolean) => setV((o) => ({ ...o, [k]: on }))
  const locked = !unlocked

  return (
    <form action={formAction} className="space-y-6">
      {locked && (
        <div className="rounded-xl bg-ink/[0.04] p-4 text-sm leading-relaxed text-ink/70">
          Writing in your voice comes with the Marvberry Assistant plan.{" "}
          <a href="/support" className="font-medium text-ink underline underline-offset-2">Ask us about it</a>. Your
          morning update and offer follow-ups work on every plan.
        </div>
      )}

      {!locked && (
        <p className="text-sm text-ink/60">
          Marvberry writes up to 300 messages a month for you. If you ever reach that, it picks back up on the 1st, and
          everything else keeps working.
        </p>
      )}

      <section className={group}>
        <p className={groupTitle}>Your clients</p>
        <Switch
          name="reminders"
          title="Reminders in your voice"
          line="When a client owes you something, a reminder is written for you, ready to send."
          checked={v.reminders}
          onChange={set("reminders")}
          locked={locked}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="auto" checked={v.auto} onChange={(e) => set("auto")(e.target.checked)} className="mt-1 h-4 w-4 accent-[#16151a]" />
            <span className="text-[13.5px] leading-relaxed text-ink/70">
              <span className="font-medium text-ink">Send them for me.</span> They go out on their own each morning, in
              your name. Leave this off to read each one first.
            </span>
          </label>
        </Switch>
      </section>

      <section className={group}>
        <p className={groupTitle}>Writing</p>
        <Switch
          name="replies"
          title="Reply drafts"
          line="When a client writes to you, tap “Draft my reply” and it's written the way you'd say it. Replies always wait for you."
          checked={v.replies}
          onChange={set("replies")}
          locked={locked}
        />
        {!locked && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink/70">A few messages you&rsquo;ve written</span>
            <textarea
              name="voice"
              rows={5}
              defaultValue={voice}
              placeholder={"Paste two or three texts or emails you've sent clients. Leave a blank line between each one."}
              className="w-full resize-y rounded-xl border border-ink/15 bg-white/70 px-4 py-3 text-sm leading-relaxed outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
            />
            <span className="mt-1.5 block text-xs text-ink/50">
              Your drafts learn how you sound from these and from what you send in Marvberry. Your clients never see this.
            </span>
          </label>
        )}
      </section>

      <section className={group}>
        <p className={groupTitle}>Your day</p>
        <Switch
          name="morning"
          title="Morning update"
          line="One short email each morning: what's due today across your deals, and which reminders are ready to send."
          checked={v.morning}
          onChange={set("morning")}
        />
      </section>

      <section className={group}>
        <p className={groupTitle}>Deals</p>
        <Switch
          name="offerNudges"
          title="Offer follow-ups"
          line="Flags an offer with a pink dot when it's within a day of running out, with the follow-up already written."
          checked={v.offerNudges}
          onChange={set("offerNudges")}
        />
      </section>

      {state && (
        <p role="status" className={"rounded-lg px-4 py-3 text-sm " + (state.ok ? "bg-sage/15 text-ink/80" : "bg-red-50 text-red-800")}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ox px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  )
}
