"use client"

import { useState } from "react"
import { setSuspended, cancelSubscription, deleteAccount } from "./account-actions"

export default function AccountControls({ id, name, suspended }: { id: string; name: string; suspended: boolean }) {
  const [busy, setBusy] = useState("")
  const [note, setNote] = useState("")
  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key)
    setNote("")
    const m = await fn().catch(() => "That didn’t work. Try again.")
    setBusy("")
    if (m) setNote(m)
  }
  const btn = "rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50"
  return (
    <section className="mt-10 rounded-2xl border border-[#16151a]/10 bg-white p-5">
      <p className="text-sm font-semibold text-[#16151a]">Account</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("s", () => setSuspended(id, !suspended))}
          className={`${btn} border-[#16151a]/15 bg-white text-[#16151a]`}
        >
          {busy === "s" ? "Working…" : suspended ? "Turn back on" : "Suspend"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => confirm(`Cancel ${name}’s subscription? They keep access until the period they paid for ends.`) && run("c", () => cancelSubscription(id))}
          className={`${btn} border-[#16151a]/15 bg-white text-[#16151a]`}
        >
          {busy === "c" ? "Working…" : "Cancel subscription"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => {
            const typed = prompt(`This deletes ${name}’s account, clients, documents and bookings for good. Type DELETE to confirm.`)
            if (typed === "DELETE") run("d", () => deleteAccount(id))
          }}
          className={`${btn} border-[#b3261e]/30 bg-white text-[#b3261e]`}
        >
          {busy === "d" ? "Deleting…" : "Delete account"}
        </button>
      </div>
      {note && <p className="mt-3 text-sm text-[#16151a]/70">{note}</p>}
      <p className="mt-3 text-xs text-[#16151a]/45">Suspend keeps everything and can be undone. Delete can’t.</p>
    </section>
  )
}
