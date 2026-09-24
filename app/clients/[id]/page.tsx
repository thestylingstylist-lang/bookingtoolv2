import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import JacketDetails from "./jacket-details"

export const dynamic = "force-dynamic"

type Client = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

export default async function ClientJacket({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: agentData } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, address, created_at")
    .eq("id", id)
    .maybeSingle()
  const client = data as Client | null
  if (!client) notFound()

  const name = `${client.first_name} ${client.last_name}`.trim() || "Client"

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/clients"
          className="text-sm text-ink/50 underline-offset-2 hover:text-ink/80 hover:underline"
        >
          &larr; All clients
        </Link>

        {sp.updated && (
          <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
            Client updated.
          </p>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium tracking-wide text-sage">Client</p>
          <h1 className="mt-2 font-serif text-3xl">{name}</h1>
        </div>

        <JacketDetails client={client} />

        {/* Actions — signatures, checklist, documents land here next */}
        <section className="mt-10">
          <h2 className="font-serif text-xl">Paperwork</h2>
          <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-white/40 p-10 text-center">
            <p className="text-ink/50">
              Sending agreements and disclosures for signature lands here next.
            </p>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
