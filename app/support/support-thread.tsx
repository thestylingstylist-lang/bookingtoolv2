"use client"

import { useEffect, useRef } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { sendSupportMessage, type SupportResult } from "@/app/support-actions"

export type Msg = { id: string; body: string; from_team: boolean; created_at: string }

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function Send() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#16151a] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  )
}

export default function SupportThread({ messages }: { messages: Msg[] }) {
  const [state, action] = useFormState<SupportResult | null, FormData>(sendSupportMessage, null)
  const formRef = useRef<HTMLFormElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  return (
    <div className="mt-8 rounded-2xl border border-[#16151a]/10 bg-white">
      <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-[#16151a]/50">
            No messages yet. Ask us anything — setup, a client, a bug, an idea.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.from_team ? "flex justify-start" : "flex justify-end"}>
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                (m.from_team ? "bg-[#f4f3f1] text-[#16151a]" : "bg-[#16151a] text-white")
              }
            >
              {m.from_team && <p className="mb-0.5 text-xs font-semibold text-[#16151a]/55">Marvberry team</p>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={"mt-1 text-[11px] " + (m.from_team ? "text-[#16151a]/40" : "text-white/55")}>{when(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form ref={formRef} action={action} className="border-t border-[#16151a]/10 p-4">
        <textarea
          name="body"
          rows={3}
          maxLength={4000}
          required
          placeholder="Type your message…"
          className="w-full resize-none rounded-lg border border-[#16151a]/15 px-3 py-2 text-sm outline-none focus:border-[#16151a]/40"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={"text-sm " + (state?.ok ? "text-[#16151a]/60" : "text-[#b42318]")}>{state?.message ?? ""}</p>
          <Send />
        </div>
      </form>
    </div>
  )
}
