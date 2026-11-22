"use client"

import Link from "next/link"
import RowMenu from "@/app/row-menu"
import { deleteClient } from "./actions"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
}

export default function ClientRow({ client }: { client: Client }) {
  const name = `${client.first_name} ${client.last_name}`.trim() || "Client"
  return (
    <tr className="border-b border-lxink/5 last:border-0 hover:bg-white/40">
      <td className="cell-lead px-5 py-4">
        <Link
          href={`/clients/${client.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {name}
        </Link>
      </td>
      <td data-label="Contact" className="px-5 py-4">
        <div className="flex flex-col">
          {client.phone && <span>{client.phone}</span>}
          {client.email && <span className="text-lxink/50">{client.email}</span>}
        </div>
      </td>
      <td data-label="Address" className="px-5 py-4 text-lxink/60">{client.address || "\u2014"}</td>
      <td className="cell-act px-5 py-4 whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-1">
        <Link
          href={`/clients/${client.id}`}
          className="rounded-lg border border-lxink/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-lxink hover:text-lxbg"
        >
          Open
        </Link>
        <RowMenu
          action={deleteClient}
          id={client.id}
          label={name}
          confirmText={`Delete ${name}? Their steps, documents, messages and uploads go too. This can't be undone.`}
        />
        </div>
      </td>
    </tr>
  )
}
