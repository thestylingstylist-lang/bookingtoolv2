"use client"

import { useState, useTransition } from "react"
import { sendMessage } from "./actions"
import { draftReply } from "./draft-actions"

// The message box. With Marvberry Assistant on and the client waiting on a
// reply, she can ask for a draft in her voice. It lands in the box; she reads,
// edits, and sends. Nothing goes out without her tap.
export default function Composer({
  clientId,
  clientFirst,
  canDraft,
}: {
  clientId: string
  clientFirst: string
  canDraft: boolean
}) {
  const [text, setText] = useState("")
  const [writing, start] = useTransition()
  const [missed, setMissed] = useState(false)

  const draft = () =>
    start(async () => {
      setMissed(false)
      const { text: drafted } = await draftReply(clientId)
      if (drafted) setText(drafted)
      else setMissed(true)
    })

  return (
    <div>
      {canDraft && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[#e4e3e0] bg-[#f7f6f4] px-3 py-2">
          <p className="text-xs text-[#5d5b62]">
            {writing ? (
              "Writing your reply in your voice…"
            ) : missed ? (
              "The assistant couldn’t write this one. Type your reply below."
            ) : (
              <>
                <span className="font-semibold text-ink">Marvberry Assistant</span> &middot; {clientFirst || "Your client"} is
                waiting on a reply.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={draft}
            disabled={writing}
            className="shrink-0 rounded-[8px] bg-ink px-2.5 py-1.5 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-40"
          >
            {text ? "Write it again" : "Draft my reply"}
          </button>
        </div>
      )}
      <form action={sendMessage} className="flex items-end gap-3">
        <input type="hidden" name="clientId" value={clientId} />
        <textarea
          name="body"
          rows={text ? 5 : 1}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className={`flex-1 resize-y rounded-xl border border-[#e4e3e0] bg-[#f1f0ee] px-4 py-2.5 text-sm leading-relaxed outline-none placeholder:text-[#5d5b62] focus:border-sage focus:bg-white ${
            writing ? "opacity-50" : ""
          }`}
        />
        <button
          type="submit"
          disabled={writing}
          className="rounded-[11px] bg-ox px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
