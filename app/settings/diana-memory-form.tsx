"use client"

import { useState } from "react"
import { saveKeepSetting, deleteMemory, clearMemories } from "@/app/assistant-actions"

type Note = { id: string; body: string; client_name?: string }

// After each conversation: keep it or clear it. And what Diana remembers,
// which the agent can delete one by one or all at once.
export default function DianaMemoryForm({ name, keep, notes }: { name: string; keep: boolean; notes: Note[] }) {
  const [k, setK] = useState(keep)
  const [list, setList] = useState(notes)
  const [msg, setMsg] = useState("")
  const [asking, setAsking] = useState(false)
  const you = list.filter((n) => !n.client_name)
  const clients = list.filter((n) => n.client_name)
  const link = "border-0 border-b border-lxgold bg-transparent p-0 text-lxink"

  const row = (n: Note) => (
    <div key={n.id} className="flex items-baseline justify-between gap-5 border-b border-lxink/10 py-3 text-[14px]">
      <span>
        {n.body}
        {n.client_name && <span className="text-lxsoft"> &middot; {n.client_name}</span>}
      </span>
      <button
        type="button"
        className={`${link} shrink-0 text-[12.5px]`}
        onClick={async () => {
          const r = await deleteMemory(n.id)
          if (r.ok) setList((l) => l.filter((x) => x.id !== n.id))
        }}
      >
        Delete
      </button>
    </div>
  )

  return (
    <div className="mt-8 space-y-8 border-t border-lxink/10 pt-6">
      <div>
        <p className="m-0 text-[15px] text-lxink">After each conversation</p>
        <p className="mb-3 mt-1 text-[12.5px] text-lxsoft">Keep it to find it later in History, for 90 days. Clear it to start fresh each time. Conversations end on their own when your working day ends.</p>
        <div className="flex gap-7 text-[14px]">
          {[
            { v: true, label: "Keep it" },
            { v: false, label: "Clear it" },
          ].map((o) => (
            <label key={o.label} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="assistantKeep"
                checked={k === o.v}
                onChange={async () => {
                  setK(o.v)
                  setMsg((await saveKeepSetting(o.v)).message)
                }}
                className="accent-lxink"
              />
              {o.label}
            </label>
          ))}
        </div>
        {msg && <p role="status" className="mt-2 text-[12.5px] text-lxsoft">{msg}</p>}
      </div>

      <div>
        <p className="m-0 text-[15px] text-lxink">What {name} remembers</p>
        <p className="mb-2 mt-1 text-[12.5px] text-lxsoft">Short notes {name} keeps so you don&rsquo;t have to repeat yourself. Only you can see them.</p>
        {list.length === 0 && <p className="mt-3 text-[13.5px] text-lxsoft">Nothing yet. As you work together, {name} keeps short notes here.</p>}
        {you.length > 0 && (
          <>
            <p className="mb-0 mt-4 text-[11.5px] uppercase tracking-[.08em] text-lxsoft">About you</p>
            {you.map(row)}
          </>
        )}
        {clients.length > 0 && (
          <>
            <p className="mb-0 mt-5 text-[11.5px] uppercase tracking-[.08em] text-lxsoft">About your clients</p>
            {clients.map(row)}
          </>
        )}
        {list.length > 0 &&
          (asking ? (
            <p className="mt-4 text-[13px] text-lxink">
              Clear everything {name} remembers? She&rsquo;ll start learning again from your next chat.{" "}
              <button
                type="button"
                className={link}
                onClick={async () => {
                  const r = await clearMemories()
                  if (r.ok) setList([])
                  setAsking(false)
                }}
              >
                Clear all
              </button>{" "}
              <button type="button" className="ml-3 border-0 bg-transparent p-0 text-lxsoft" onClick={() => setAsking(false)}>
                Cancel
              </button>
            </p>
          ) : (
            <p className="mt-4 text-[13px]">
              <button type="button" className={link} onClick={() => setAsking(true)}>Clear all</button>
            </p>
          ))}
      </div>
    </div>
  )
}
