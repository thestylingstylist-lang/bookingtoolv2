import { createClient } from "@/lib/supabase/server"
import { signedPdf } from "@/lib/signing"

export const dynamic = "force-dynamic"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The agent's copy of a signed document, from the client's file. Only the agent who owns it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Sign in to open this document.", { status: 401 })
  const { data: doc } = await supabase.from("documents").select("id, status").eq("id", id).eq("agent_id", user.id).maybeSingle()
  if (!doc || doc.status !== "signed") return new Response("Not found", { status: 404 })
  const pdf = await signedPdf(doc.id as string)
  if (!pdf) return new Response("Not found", { status: 404 })
  return new Response(Buffer.from(pdf.bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.filename}"`, "Cache-Control": "private, no-store" },
  })
}
