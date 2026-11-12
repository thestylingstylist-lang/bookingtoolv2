import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"

// The agent's guide, by a link that never breaks: each visit gets a fresh
// short-lived link to the file in private storage.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) return new Response("Not found", { status: 404 })
  const admin = createAdminClient()
  const { data } = await admin.from("agents").select("guide_path, guide_url").eq("id", agent.id).maybeSingle()
  if (data?.guide_path) {
    const { data: link } = await admin.storage.from("client-docs").createSignedUrl(data.guide_path as string, 600)
    if (link?.signedUrl) return Response.redirect(link.signedUrl, 302)
  }
  if (data?.guide_url) return Response.redirect(data.guide_url as string, 302)
  return new Response("This guide isn’t available right now.", { status: 404 })
}
