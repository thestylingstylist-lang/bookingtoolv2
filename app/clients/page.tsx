import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import { addClient } from "./actions"
import ClientRow from "./client-row"
import { loadAssistantName } from "@/lib/assistant-name"
import NotifyBand from "./notify-band"

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
  const assistantName = await loadAssistantName(supabase, user.id)

  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, address, created_at")
    .order("created_at", { ascending: false })
  const clients = (data ?? []) as Client[]

  // Notifications are offered once, after the first client. Hidden until the
  // database knows about them, so "Not now" always sticks.
  const { data: asked, error: askedErr } = await supabase.from("agents").select("notify_prompt").eq("id", user.id).maybeSingle()
  const offerNotify = clients.length > 0 && !askedErr && !asked?.notify_prompt

  const inputClass =
    "w-full rounded-lg border border-lxink/15 bg-white px-3 py-2 text-sm outline-none focus:border-lxgold"

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <p className="text-sm font-medium tracking-wide text-lxgold">Clients</p>
        <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">Your people</h1>

        {params.added && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client added. Open them to send their suite link.
          </p>
        )}
        {offerNotify && <NotifyBand letter={assistantName} />}
        {params.updated && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client updated.
          </p>
        )}
        {params.deleted && (
          <p className="mt-6 rounded-lg bg-lxgold/10 px-4 py-3 text-sm text-lxgold">
            Client deleted, with their steps, documents and messages.
          </p>
        )}
        {params.error === "delete" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            That client didn&rsquo;t delete. Refresh the page and try again.
          </p>
        )}
        {params.error === "name" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Add a first or last name, then save.
          </p>
        )}
        {params.error === "save" && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            That client didn&rsquo;t save. Check the details and try again.
          </p>
        )}

        {/* Add a client */}
        <form
          action={addClient}
          className="mt-8 rounded-2xl border border-lxink/10 bg-card p-6"
        >
          <h2 className="font-serif font-semibold tracking-tight text-xl">Add a client</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-lxink/60">First name</label>
              <input name="firstName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Last name</label>
              <input name="lastName" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Email</label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-lxink/60">Phone</label>
              <input name="phone" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-lxink/60">Address</label>
              <input name="address" className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 rounded-lg bg-lxink px-5 py-2.5 text-sm font-medium text-lxbg transition-opacity hover:opacity-90"
          >
            Add client
          </button>
        </form>

        {/* List */}
        {clients.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-lxink/10 bg-card p-10 text-center">
            <h2 className="font-serif font-semibold tracking-tight text-xl">No clients yet.</h2>
            <p className="mt-2 text-lxink/60">
              Add your first one above, and {assistantName} will take it from there.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-lxink/10 bg-card">
            <table className="stack-sm w-full text-left text-sm">
              <thead className="border-b border-lxink/10 text-lxink/50">
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
