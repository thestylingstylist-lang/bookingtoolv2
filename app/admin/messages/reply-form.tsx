"use client"

import { useEffect, useRef } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { sendTeamReply, type SupportResult } from "@/app/support-actions"

function Send() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gradient-to-r from-[#D9467A] to-[#EE7C55] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Reply"}
    </button>
  )
}

export default function ReplyForm({ agentId }: { agentId: string }) {
  const [state, action] = useFormState<SupportResult | null, FormData>(sendTeamReply, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) ref.current?.reset()
  }, [state])
  return (
    <form ref={ref} action={action} className="border-t border-[#16151a]/8 p-4">
      <input type="hidden" name="agent_id" value={agentId} />
      <textarea
        name="body"
        rows={3}
        required
        maxLength={4000}
        placeholder="Write your reply…"
        className="w-full resize-none rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[#D9467A]"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={"text-sm " + (state?.ok ? "text-[#16151a]/55" : "text-[#b42318]")}>{state?.message ?? ""}</p>
        <Send />
      </div>
    </form>
  )
}
