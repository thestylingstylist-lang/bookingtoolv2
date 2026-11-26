import { createAdminClient } from "@/lib/supabase/admin"
import { signedPdf } from "@/lib/signing"

export const dynamic = "force-dynamic"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The client's signed copy, from their private signing link.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!UUID_RE.test(token)) return new Response("Not found", { status: 404 })
  const { data: doc } = await createAdminClient().from("documents").select("id, status").eq("sign_token", token).maybeSingle()
  if (!doc || doc.status !== "signed") return new Response("Not found", { status: 404 })
  const pdf = await signedPdf(doc.id as string)
  if (!pdf) return new Response("Not found", { status: 404 })
  return new Response(Buffer.from(pdf.bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.filename}"`, "Cache-Control": "private, no-store" },
  })
}
