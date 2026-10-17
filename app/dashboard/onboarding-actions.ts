"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// A realtor sends a requested document to the team during onboarding. The file
// goes straight from their browser to storage with a one-time upload link.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = "onboarding-docs"
const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
]

async function findDoc(docId: string) {
  if (!UUID_RE.test(docId)) return null
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("onboarding_docs")
    .select("id, title, agent_id")
    .eq("id", docId)
    .eq("agent_id", user.id)
    .maybeSingle()
  if (!doc) return null
  return { admin, user, doc }
}

export async function startSetupUpload(
  docId: string,
  fileName: string,
  size: number,
  type: string
): Promise<{ ok: true; path: string; uploadToken: string } | { ok: false; error: string }> {
  if (size > MAX_BYTES) return { ok: false, error: "That file is too big. The limit is 20 MB." }
  if (!ALLOWED.includes(type)) return { ok: false, error: "Please upload a PDF, a Word file or a photo." }
  const found = await findDoc(docId)
  if (!found) return { ok: false, error: "Something went wrong. Please refresh and try again." }
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file"
  const path = `${found.user.id}/${docId}-${Date.now()}-${safe}`
  const { data, error } = await found.admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Please try again." }
  return { ok: true, path, uploadToken: data.token }
}

export async function finishSetupUpload(docId: string, path: string, fileName: string): Promise<{ ok: boolean }> {
  const found = await findDoc(docId)
  if (!found) return { ok: false }
  if (!path.startsWith(`${found.user.id}/${docId}-`)) return { ok: false }

  const { data: old } = await found.admin.from("onboarding_docs").select("file_path").eq("id", docId).maybeSingle()
  const { error } = await found.admin
    .from("onboarding_docs")
    .update({ file_path: path, file_name: fileName.slice(0, 200), uploaded_at: new Date().toISOString(), template_built: false })
    .eq("id", docId)
  if (error) return { ok: false }
  if (old?.file_path && old.file_path !== path) await found.admin.storage.from(BUCKET).remove([old.file_path as string])

  // A line in the chat, so the team sees it arrive (and the Support badge lights up).
  const { data: ag } = await found.admin.from("agents").select("full_name").eq("id", found.user.id).maybeSingle()
  await found.admin.from("support_messages").insert({
    agent_id: found.user.id,
    agent_email: found.user.email ?? null,
    agent_name: (ag?.full_name as string) || null,
    body: `Uploaded: ${found.doc.title}`,
    from_team: false,
    read_by_team: false,
    read_by_agent: true,
  })

  revalidatePath("/dashboard")
  revalidatePath("/admin/onboarding")
  return { ok: true }
}
