"use client"

import { useActionState } from "react"
import { saveMeetingLengths, type MeetingLengthsResult } from "./meeting-actions"

const CALL = [15, 20, 30, 45, 60]
const IN_PERSON = [30, 45, 60, 90, 120]
const words = (m: number) => (m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} hours`)

// The lengths Diana suggests when she arranges a meeting. The agent can still
// change any one meeting in the chat.
export default function MeetingForm({ call, inPerson, name }: { call: number; inPerson: number; name: string }) {
  const [state, action, pending] = useActionState<MeetingLengthsResult | null, FormData>(saveMeetingLengths, null)
  const select = "mt-1 block w-full border-0 border-b border-lxgold bg-transparent py-2 text-[15px] text-lxink"
  return (
    <form action={action} className="mt-8 border-t border-lxink/10 pt-6">
      <p className="m-0 text-[15px] text-lxink">Meetings {name} arranges</p>
      <p className="mb-0 mt-1 text-[12.5px] text-lxsoft">The lengths she suggests. You can change any one meeting in the chat. Video calls use your meeting link from booking settings.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <label className="block text-[13px] text-lxsoft">
          A call
          <select name="call" defaultValue={String(call)} className={select}>
            {CALL.map((m) => (
              <option key={m} value={m}>{words(m)}</option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] text-lxsoft">
          In person
          <select name="inPerson" defaultValue={String(inPerson)} className={select}>
            {IN_PERSON.map((m) => (
              <option key={m} value={m}>{words(m)}</option>
            ))}
          </select>
        </label>
      </div>
      {state && <p role="status" className="mt-3 text-[13px] text-lxsoft">{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-4 rounded-[2px] border border-lxink bg-transparent px-6 py-2.5 text-sm text-lxink disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  )
}
