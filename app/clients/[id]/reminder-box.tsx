"use client"

import { useRef, useState, useTransition } from "react"
import { sendNudge } from "@/app/dashboard/nudge-actions"
import { draftReminder } from "./draft-actions"

// Opens with the plain draft. With the assistant on her plan, the
// assistant rewrites it in her voice. She reads it, edits anything, and sends.
// Nothing goes out without her tap.
export default function ReminderBox({
  stepId,
  who,
  agentFirst,
  fallback,
  open,
  assistant = false,
  assistantName = "Diana",
}: {
  stepId: string
  who: string
  agentFirst?: string
  fallback: string
  open?: boolean
  assistant?: boolean
  assistantName?: string
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
      className="group/rb mt-1"
      onToggle={(e) => {
        if (assistant && (e.currentTarget as HTMLDetailsElement).open && !asked.current) {
          asked.current = true
          write()
        }
      }}
    >
      <summary className="block cursor-pointer list-none rounded-lg border border-lxhair bg-lxfill px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="block text-xs font-semibold text-lxink">Ready to send</span>
        <span className="mt-0.5 block font-semibold tracking-tight text-xs text-lxsoft">
          {assistant ? `Your reminder, written in your voice by ${assistantName}.` : "Your reminder."}
        </span>
        <span className="mt-2 inline-block rounded-[2px] border border-lxink px-2.5 py-1.5 text-xs text-lxink group-open/rb:hidden">
          Read, edit, send.
        </span>
      </summary>
      <form action={sendNudge} className="mt-2 space-y-2">
        <input type="hidden" name="stepId" value={stepId} />
        <input type="hidden" name="from" value="client" />
        {writing && <p className="text-xs text-lxsoft">{assistantName} is writing this in your voice…</p>}
        <textarea
          name="body"
          rows={8}
          aria-label={`Reminder to ${who}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full resize-y rounded-lg border border-lxhair bg-white px-3 py-2 text-sm leading-relaxed outline-none transition-opacity focus:border-lxink/30 ${
            writing ? "opacity-50" : ""
          }`}
        />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={writing || !text.trim()}
            className="rounded-[10px] bg-lxink px-3 py-2 text-xs font-medium text-lxbg hover:opacity-90 disabled:opacity-40"
          >
            Send{agentFirst ? ` as ${agentFirst}` : ""}
          </button>
          {assistant && <button
            type="button"
            onClick={write}
            disabled={writing}
            className="text-xs text-lxsoft underline underline-offset-2 hover:text-lxink disabled:opacity-40"
          >
            Write it again
          </button>}
        </div>
      </form>
    </details>
  )
}
