import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import TemplateEditor from "../template-editor"
import { updateTemplate } from "../actions"

export const dynamic = "force-dynamic"

export default async function EditTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; saved?: string; error?: string }>
}) {
  const sp = await searchParams
  const id = sp.id
  if (!id) redirect("/templates")

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

  const { data: tpl } = await supabase
    .from("document_templates")
    .select("id, title, body")
    .eq("id", id)
    .maybeSingle()
  if (!tpl) notFound()

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/templates" className="text-sm text-ink/50 hover:text-ink">
          &larr; Templates
        </Link>
        <h1 className="mt-2 font-serif text-3xl">Edit template</h1>
        <div className="mt-8">
          <TemplateEditor
            action={updateTemplate}
            id={tpl.id as string}
            initialTitle={tpl.title as string}
            initialBody={(tpl.body as string) ?? ""}
            saved={!!sp.saved}
            error={!!sp.error}
          />
        </div>
      </main>
    </AppShell>
  )
}
