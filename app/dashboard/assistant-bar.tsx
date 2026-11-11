"use client"
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
        className="flex items-center gap-3 rounded-full border border-[#efc9df] bg-white py-2 pl-2 pr-2 shadow-[0_14px_34px_-24px_rgba(188,85,158,.6)]"
      >
        <img src="/brand/berry-clear.webp" alt="" className="h-9 w-9 shrink-0 object-contain" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`What can ${name} take off your plate today?`}
          aria-label={`Ask ${name}`}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#16151a] outline-none placeholder:text-[#16151a]/45"
        />
        <button
          type="submit"
          aria-label={`Ask ${name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#16151a] text-white"
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
            className="rounded-full bg-[#FBEDF5] px-3 py-1.5 text-[13px] text-[#93407A] hover:bg-[#f6dceb]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
