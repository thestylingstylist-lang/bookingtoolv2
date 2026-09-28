"use client"

import { useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { setQuarterGoal, type GoalResult } from "./goal-actions"

function Save() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-[#16151a] px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60">
      {pending ? "Saving…" : "Save"}
    </button>
  )
}

export default function GoalForm({ goalKey, current }: { goalKey: string; current: number | null }) {
  const [open, setOpen] = useState(current == null)
  const [state, action] = useFormState<GoalResult | null, FormData>(async (p, f) => {
    const r = await setQuarterGoal(p, f)
    if (r.ok) setOpen(false)
    return r
  }, null)

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-medium text-[#D9467A] hover:underline">
        Change goal
      </button>
    )

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="key" value={goalKey} />
      <div className="flex items-center rounded-lg border border-[#16151a]/15 bg-white px-3">
        <span className="text-sm text-[#16151a]/50">$</span>
        <input
          name="goal"
          inputMode="numeric"
          defaultValue={current ?? ""}
          placeholder="Quarterly goal"
          className="w-36 bg-transparent px-1 py-2 text-sm outline-none"
        />
      </div>
      <Save />
      {state && !state.ok && <p className="w-full text-sm text-[#b42318]">{state.message}</p>}
    </form>
  )
}
