"use client"
import { useState, useTransition } from "react"
import { setStage, setNextStep, setNotes, deleteLead } from "./actions"
import { STAGES, type Stage } from "./stages"

const LABEL: Record<Stage, string> = {
  new: "New", call_booked: "Call booked", called: "Called", member: "Member", lost: "Lost",
}

export default function LeadRow({
  id, name, email, phone, source, stage, nextStep, notes, callAt, createdAt,
}: {
  id: string; name: string; email: string | null; phone: string | null
  source: string | null; stage: Stage; nextStep: string | null; notes: string | null
  callAt: string | null; createdAt: string
}) {
  const [pending, start] = useTransition()
  const [step, setStep] = useState(nextStep ?? "")
  const [note, setNote] = useState(notes ?? "")

  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-3 py-2.5 align-top">
        <p className="font-medium text-[#16151a]">{name}</p>
        {email && <p className="whitespace-nowrap text-xs text-[#16151a]/50">{email}</p>}
        {phone && <p className="whitespace-nowrap text-xs text-[#16151a]/50">{phone}</p>}
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-[#16151a]/55">{source || "—"}</td>
      <td className="px-3 py-2.5 align-top">
        <select
          value={stage}
          disabled={pending}
          onChange={(e) => start(() => setStage(id, e.target.value as Stage))}
          className="rounded-full border border-[#16151a]/15 bg-white px-3 py-1 text-xs font-medium text-[#16151a]"
        >
          {STAGES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 align-top min-w-[150px] whitespace-nowrap text-xs text-[#16151a]/70">{when(callAt)}</td>
      <td className="px-3 py-2.5 align-top">
        <input
          value={step}
          disabled={pending}
          onChange={(e) => setStep(e.target.value)}
          onBlur={() => { if (step !== (nextStep ?? "")) start(() => setNextStep(id, step)) }}
          placeholder="Next step…"
          className="w-full rounded-lg border border-[#16151a]/15 bg-white px-2.5 py-1 text-xs text-[#16151a]"
        />
      </td>
      <td className="px-3 py-2.5 align-top">
        <input
          value={note}
          disabled={pending}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (notes ?? "")) start(() => setNotes(id, note)) }}
          placeholder="Notes…"
          className="w-full rounded-lg border border-[#16151a]/15 bg-white px-2.5 py-1 text-xs text-[#16151a]"
        />
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-[#16151a]/40 whitespace-nowrap text-right">{when(createdAt)}</td>
      <td className="px-3 py-2.5 align-top text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => { if (confirm(`Delete ${name}? This can\u2019t be undone.`)) start(() => deleteLead(id)) }}
          className="rounded-full border border-[#16151a]/15 bg-white px-3 py-1 text-xs text-[#16151a]/60 hover:border-[#D9467A] hover:text-[#D9467A]"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
