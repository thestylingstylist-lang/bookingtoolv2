import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import { addClient } from "./actions"
import ClientRow from "./client-row"

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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; deleted?: string; error?: string }>
}) {
  const params = await searchParams
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
    .order("created_at", { ascending: false })
  const clients = (data ?? []) as Client[]

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-medium tracking-wide text-sage">Clients</p>
        <h1 className="mt-2 font-serif text-3xl">Your people</h1>

        {params.added && (
          <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
            Client added.
          </p>
        )}
        {params.updated && (
          <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
            Client updated.
          </p>
        )}
        {params.deleted && (
          <p className="mt-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
            Client deleted.
          </p>
        )}
        {params.error === "delete" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn&rsquo;t delete that client. Please try again.
          </p>
        )}
        {params.error === "name" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Please enter at least a first or last name.
          </p>
        )}
        {params.error === "save" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn&rsquo;t save that client. Please try again.
          </p>
        )}

        {/* Add a client */}
        <form
          action={addClient}
          className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-6"
        >
          <h2 className="font-serif text-xl">Add a client</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-ink/60">First name</label>
              <input name="firstName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink/60">Last name</label>
              <input name="lastName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink/60">Email</label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-ink/60">Phone</label>
              <input name="phone" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-ink/60">Address</label>
              <input name="address" className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Add client
          </button>
        </form>

        {/* List */}
        {clients.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-ink/10 bg-white/50 p-10 text-center">
            <h2 className="font-serif text-xl">No clients yet.</h2>
            <p className="mt-2 text-ink/60">
              Add your first client above, and they&rsquo;ll appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-ink/10 bg-white/50">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Address</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <ClientRow key={c.id} client={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AppShell>
  )
}
