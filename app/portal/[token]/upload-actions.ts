"use server"

import { recordActivity } from "@/lib/client-activity"
import { tickStep, loadDocSteps, docStepTitle } from "@/lib/auto-steps"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

// Client uploads a requested document from their portal. The file goes
// straight from their browser to storage using a one-time upload link, so
// big phone photos don't hit the server's size limit.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = "client-docs"
const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]

async function findDoc(token: string, docId: string) {
  if (!UUID_RE.test(token) || !UUID_RE.test(docId)) return null
  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("id, agent_id")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) return null
  const { data: doc } = await admin
    .from("collected_docs")
    .select("id, title")
    .eq("id", docId)
    .eq("client_id", client.id)
    .maybeSingle()
  if (!doc) return null
  return { admin, client, doc }
}

export async function startUpload(
  token: string,
  docId: string,
  fileName: string,
  size: number,
  type: string
): Promise<{ ok: true; path: string; uploadToken: string } | { ok: false; error: string }> {
  if (size > MAX_BYTES) return { ok: false, error: "That file is too big. The limit is 15 MB." }
  if (!ALLOWED.includes(type)) return { ok: false, error: "Please upload a PDF or a photo." }
  const found = await findDoc(token, docId)
  if (!found) return { ok: false, error: "Something went wrong. Please refresh and try again." }

  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file"
  const path = `${found.client.agent_id}/${found.client.id}/${docId}-${Date.now()}-${safe}`
  const { data, error } = await found.admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Please try again." }
  return { ok: true, path, uploadToken: data.token }
}

export async function finishUpload(
  token: string,
  docId: string,
  path: string,
  fileName: string
): Promise<{ ok: boolean }> {
  const found = await findDoc(token, docId)
  if (!found) return { ok: false }
  // The path must be inside this client's folder.
  if (!path.startsWith(`${found.client.agent_id}/${found.client.id}/${docId}-`)) return { ok: false }

  const { error } = await found.admin
    .from("collected_docs")
    .update({
      received: true,
      received_at: new Date().toISOString(),
      file_path: path,
      file_name: fileName.slice(0, 200),
    })
    .eq("id", docId)
  if (error) return { ok: false }

  // Drop a note in the conversation so the realtor sees it came in.
  await found.admin.from("messages").insert({
    agent_id: found.client.agent_id,
    client_id: found.client.id,
    sender: "client",
    body: `Uploaded: ${found.doc.title}`,
  })

  // Every document for its step is in: the step is done.
  const cid = found.client.id as string
  const [{ data: rest }, { data: stepRows }, docSteps] = await Promise.all([
    found.admin.from("collected_docs").select("id, title, received").eq("client_id", cid),
    found.admin.from("steps").select("id, title").eq("client_id", cid),
    loadDocSteps(found.admin, cid),
  ])
  const titles = new Map(((stepRows ?? []) as { id: string; title: string }[]).map((r) => [r.id, r.title]))
  const step = docStepTitle({ id: docId, title: found.doc.title as string }, docSteps, titles)
  if (((rest ?? []) as { id: string; title: string; received: boolean }[]).filter((d) => docStepTitle(d, docSteps, titles) === step).every((d) => d.received)) {
    await tickStep(found.admin, cid, step)
  }

  // Let the agent know on their phone or browser.
  try {
    const { data: c } = await found.admin.from("clients").select("first_name").eq("id", found.client.id).maybeSingle()
    const first = ((c?.first_name as string | null) || "Your client").trim()
    const line = `${first} uploaded ${found.doc.title}`
    await recordActivity(found.admin, {
      agentId: found.client.agent_id as string,
      clientId: found.client.id as string,
      kind: "upload",
      line,
      detail: `Uploaded ${found.doc.title}${fileName ? ` (${fileName.slice(0, 120)})` : ""}`,
      push: `${line}.`,
    })
  } catch (err) {
    console.error("[upload] notify failed:", err)
  }

  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${found.client.id}`)
  return { ok: true }
}
