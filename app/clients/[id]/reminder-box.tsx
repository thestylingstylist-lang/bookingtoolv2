"use client"

import { useRef, useState, useTransition } from "react"
import { sendNudge } from "@/app/dashboard/nudge-actions"
import { draftReminder } from "./draft-actions"

// Opens with the plain draft, then Claude rewrites it in the realtor's voice.
// She reads it, edits anything, and sends. Nothing goes out without her tap.
export default function ReminderBox({
  stepId,
  who,
  agentFirst,
  fallback,
  open,
}: {
  stepId: string
  who: string
  agentFirst?: string
  fallback: string
  open?: boolean
}) {
  const [text, setText] = useState(fallback)
  const [writing, start] = useTransition()
  const asked = useRef(false)

  const write = () =>
    start(async () => {
      const { text: drafted } = await draftReminder(stepId)
      if (drafted) setText(drafted)
    })

  return (
    <details
      open={open}
      className="mt-1"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open && !asked.current) {
          asked.current = true
          write()
        }
      }}
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-ink underline underline-offset-2">
        Send {who} a reminder
      </summary>
      <form action={sendNudge} className="mt-2 space-y-2">
        <input type="hidden" name="stepId" value={stepId} />
        <input type="hidden" name="from" value="client" />
        <p className="text-xs text-[#5d5b62]">
          {writing ? "Writing this in your voice…" : "Your client reminder, written in your voice."}
        </p>
        <textarea
          name="body"
          rows={8}
          aria-label={`Reminder to ${who}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full resize-y rounded-lg border border-[#e4e3e0] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition-opacity focus:border-ink/30 ${
            writing ? "opacity-50" : ""
          }`}
        />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={writing || !text.trim()}
            className="rounded-[10px] bg-ink px-3 py-2 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            Send{agentFirst ? ` as ${agentFirst}` : ""}
          </button>
          <button
            type="button"
            onClick={write}
            disabled={writing}
            className="text-xs text-[#5d5b62] underline underline-offset-2 hover:text-ink disabled:opacity-40"
          >
            Write it again
          </button>
        </div>
      </form>
    </details>
  )
}
