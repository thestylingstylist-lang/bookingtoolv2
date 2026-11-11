import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import type { PdfField } from "@/lib/pdf-fields"
import PdfEditor from "./pdf-editor"

export const dynamic = "force-dynamic"

export default async function PdfTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const [{ data: agentData }, { data: t }] = await Promise.all([
    supabase.from("agents").select(AGENT_SELECT).eq("id", user.id).maybeSingle(),
    supabase.from("pdf_templates").select("id, title, file_path, fields").eq("id", id).maybeSingle(),
  ])
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")
  if (!t) notFound()
  const { data: signed } = await createAdminClient().storage.from("client-docs").createSignedUrl(t.file_path as string, 60 * 60)

  return (
    <AppShell agent={agent}>
      <PdfEditor id={t.id as string} title={t.title as string} url={signed?.signedUrl ?? ""} initial={(t.fields as PdfField[]) ?? []} />
    </AppShell>
  )
}
