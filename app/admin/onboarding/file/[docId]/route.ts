import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

// Opens a document a realtor sent in during onboarding. Team only.
export async function GET(request: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.redirect(new URL("/team", request.url))

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("onboarding_docs")
    .select("file_path, file_name, agent_id")
    .eq("id", docId)
    .maybeSingle()
  if (!doc?.file_path) return NextResponse.redirect(new URL("/admin/onboarding", request.url))

  const download = new URL(request.url).searchParams.get("download") === "1"
  const { data } = await admin.storage
    .from("onboarding-docs")
    .createSignedUrl(doc.file_path as string, 60, download ? { download: (doc.file_name as string) || true } : undefined)
  if (!data?.signedUrl) return NextResponse.redirect(new URL(`/admin/onboarding?a=${doc.agent_id}`, request.url))
  return NextResponse.redirect(data.signedUrl)
}
