"use client"

import { useState } from "react"
import { updateClient } from "./actions"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
}

export default function ClientRow({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false)

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  if (editing) {
    return (
      <tr className="border-b border-ink/5 last:border-0 bg-white/40">
        <td colSpan={4} className="px-5 py-5">
          <form action={updateClient} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={client.id} />
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
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-ink/5 last:border-0">
      <td className="px-5 py-4">
        {client.first_name} {client.last_name}
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          {client.phone && <span>{client.phone}</span>}
          {client.email && <span className="text-ink/50">{client.email}</span>}
        </div>
      </td>
      <td className="px-5 py-4 text-ink/60">{client.address || "\u2014"}</td>
      <td className="px-5 py-4 whitespace-nowrap text-right">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}
