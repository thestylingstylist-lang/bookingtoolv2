"use client"

import { useState } from "react"
import { updateClient } from "../actions"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
}

export default function JacketDetails({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false)

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  if (editing) {
    return (
      <section className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-6">
        <h2 className="font-serif text-xl">Edit details</h2>
        <form action={updateClient} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="returnTo" value={`/clients/${client.id}`} />
          <div>
            <label className="mb-1 block text-sm text-ink/60">First name</label>
            <input name="firstName" defaultValue={client.first_name} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Last name</label>
            <input name="lastName" defaultValue={client.last_name} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Email</label>
            <input name="email" type="email" defaultValue={client.email ?? ""} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Phone</label>
            <input name="phone" defaultValue={client.phone ?? ""} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-ink/60">Address</label>
            <input name="address" defaultValue={client.address ?? ""} className={inputClass} />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-ink/20 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    )
  }

  const row = (label: string, value: string | null) => (
    <div className="flex justify-between gap-4 border-b border-ink/5 py-3 last:border-0">
      <span className="text-sm text-ink/50">{label}</span>
      <span className="text-sm text-right">{value || "\u2014"}</span>
    </div>
  )

  return (
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">Details</h2>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper"
        >
          Edit
        </button>
      </div>
      <div className="mt-3">
        {row("Email", client.email)}
        {row("Phone", client.phone)}
        {row("Address", client.address)}
      </div>
    </section>
  )
}
