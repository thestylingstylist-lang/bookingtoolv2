"use client"

import DMark from "../d-mark"
// The top of the dashboard: tell Marvberry what needs to happen. Opens the chat with it.
import { useState } from "react"
import { ASK_EVENT } from "../assistant"

const PICKS = ["What’s waiting on me?", "Prepare an agreement", "Prepare an offer", "Send a client an update"]

export default function AssistantBar({ name = "Marvberry" }: { name?: string }) {
  const [text, setText] = useState("")
  const send = (t: string) => {
    const v = t.trim()
    if (!v) return window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: "" }))
    window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: v }))
    setText("")
  }
  return (
    <div className="mb-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
        className="flex items-center gap-3 py-2"
      >
        <DMark size={36} letter={name} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Ask ${name} what to take off your plate today`}
          aria-label={`Ask ${name}`}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-lxink outline-none placeholder:text-lxink/45"
        />
        <button
          type="submit"
          aria-label={`Ask ${name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-lxink bg-transparent text-lxink"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {PICKS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => send(p)}
            className="rounded-full bg-white px-3 py-1.5 text-[13px] text-lxgolddeep hover:bg-[#f6dceb]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
