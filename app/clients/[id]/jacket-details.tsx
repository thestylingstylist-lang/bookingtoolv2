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
  client_type?: string | null
}

const TYPE_LABEL: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer and seller",
}

function initials(first: string, last: string) {
  const i = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase()
  return i || "?"
}

export default function JacketDetails({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false)

  const inputClass =
    "w-full rounded-lg border border-[#ecebe6] bg-white px-3 py-2 text-sm outline-none focus:border-sage"
  const labelClass = "mb-1 block text-[11px] uppercase tracking-[0.05em] text-[#8c8a83]"

  if (editing) {
    return (
      <section>
        <h2 className="text-[13px] uppercase tracking-[0.06em] text-[#8c8a83]">Edit contact</h2>
        <form action={updateClient} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="returnTo" value={`/clients/${client.id}`} />
          <div>
            <label className={labelClass}>First name</label>
            <input name="firstName" defaultValue={client.first_name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input name="lastName" defaultValue={client.last_name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" defaultValue={client.email ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" defaultValue={client.phone ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input name="address" defaultValue={client.address ?? ""} className={inputClass} />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-2 text-sm text-[#8c8a83] transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    )
  }

  const name = `${client.first_name} ${client.last_name}`.trim() || "Client"
  const type = client.client_type ? TYPE_LABEL[client.client_type] : undefined

  const row = (label: string, value: string | null) => (
    <div className="border-b border-[#ecebe6] py-3">
      <p className="text-[11px] uppercase tracking-[0.05em] text-[#8c8a83]">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value || "\u2014"}</p>
    </div>
  )

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] uppercase tracking-[0.06em] text-[#8c8a83]">Contact</h2>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-[#8c8a83] underline-offset-2 hover:text-ink hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2e4dd] font-serif text-lg text-[#8a6a5f]">
          {initials(client.first_name, client.last_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-2xl leading-tight">{name}</p>
          {type && <p className="text-xs text-[#8c8a83]">{type}</p>}
        </div>
      </div>
      <div className="mt-3">
        {row("Phone", client.phone)}
        {row("Email", client.email)}
        {row("Address", client.address)}
      </div>
    </section>
  )
}
