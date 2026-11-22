"use client"

import { useState, useTransition } from "react"
import { sendMessage } from "./actions"
import { draftReply } from "./draft-actions"

// The message box. With the assistant on and the client waiting on a
// reply, she can ask for a draft in her voice. It lands in the box; she reads,
// edits, and sends. Nothing goes out without her tap.
export default function Composer({
  clientId,
  clientFirst,
  canDraft,
  assistantName = "Diana",
}: {
  clientId: string
  clientFirst: string
  canDraft: boolean
  assistantName?: string
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
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-lxhair bg-lxfill px-3 py-2">
          <p className="text-xs text-lxsoft">
            {writing ? (
              `${assistantName} is writing your reply in your voice…`
            ) : missed ? (
              `${assistantName} couldn’t write this one. Type your reply below.`
            ) : (
              <>
                <span className="font-semibold text-lxink">{assistantName}</span> &middot; {clientFirst || "Your client"} is
                waiting on a reply.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={draft}
            disabled={writing}
            className="shrink-0 rounded-[2px] border border-lxink bg-transparent px-2.5 py-1.5 text-xs text-lxink hover:bg-lxink/[0.04] disabled:opacity-40"
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
          placeholder={clientFirst ? `Write to ${clientFirst}…` : "Write a message…"}
          className={`flex-1 resize-y rounded-xl border border-lxhair bg-lxfill px-4 py-2.5 text-sm leading-relaxed outline-none placeholder:text-lxsoft focus:border-lxgold focus:bg-white ${
            writing ? "opacity-50" : ""
          }`}
        />
        <button
          type="submit"
          disabled={writing}
          className="rounded-[2px] border border-lxink bg-transparent px-5 py-2.5 text-sm text-lxink transition-colors hover:bg-lxink/[0.04] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
