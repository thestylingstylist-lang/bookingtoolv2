import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Opens a document the client uploaded. The realtor must own it (RLS checks
// that on the select), then we hand back a short-lived private link.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const { data: doc } = await supabase
    .from("collected_docs")
    .select("file_path, file_name")
    .eq("id", docId)
    .eq("client_id", id)
    .maybeSingle()
  if (!doc?.file_path) return NextResponse.redirect(new URL(`/clients/${id}`, request.url))

  // ?download=1 saves the file instead of opening it in a tab.
  const download = new URL(request.url).searchParams.get("download") === "1"
  const { data } = await createAdminClient()
    .storage.from("client-docs")
    .createSignedUrl(
      doc.file_path,
      60,
      download ? { download: doc.file_name || true } : undefined
    )
  if (!data?.signedUrl) return NextResponse.redirect(new URL(`/clients/${id}`, request.url))
  return NextResponse.redirect(data.signedUrl)
}
