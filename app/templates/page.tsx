import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

type Template = {
  id: string
  title: string
  created_at: string
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
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
    .from("document_templates")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
  const templates = (data ?? []) as Template[]

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-sage">
              Templates
            </p>
            <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">Your documents</h1>
          </div>
          <Link
            href="/templates/new"
            className="rounded-lg bg-ox px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            New template
          </Link>
        </div>

        {params.error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Couldn&rsquo;t save that template. Please try again.
          </p>
        )}

        {templates.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-ink/10 bg-card p-10 text-center">
            <h2 className="font-serif font-semibold tracking-tight text-xl">No templates yet.</h2>
            <p className="mt-2 text-ink/60">
              Set up a document once with your own wording, then send it to any
              client in seconds.
            </p>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-card">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/templates/edit?id=${t.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-ink/5"
              >
                <span className="font-medium">{t.title}</span>
                <span className="text-sm text-ink/40">Edit</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
