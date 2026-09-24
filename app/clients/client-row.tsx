"use client"

import Link from "next/link"

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
    <tr className="border-b border-ink/5 last:border-0 hover:bg-white/40">
      <td className="px-5 py-4">
        <Link
          href={`/clients/${client.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {name}
        </Link>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          {client.phone && <span>{client.phone}</span>}
          {client.email && <span className="text-ink/50">{client.email}</span>}
        </div>
      </td>
      <td className="px-5 py-4 text-ink/60">{client.address || "\u2014"}</td>
      <td className="px-5 py-4 whitespace-nowrap text-right">
        <Link
          href={`/clients/${client.id}`}
          className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper"
        >
          Open
        </Link>
      </td>
    </tr>
  )
}
