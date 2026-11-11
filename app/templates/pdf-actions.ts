"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PdfField } from "@/lib/pdf-fields"

const BUCKET = "client-docs"
const MAX_BYTES = 15 * 1024 * 1024

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, userId: user?.id ?? null }
}

// Step 1 of adding a PDF form: make the row and hand back a one-time upload link.
export async function startPdfTemplate(
  title: string,
  fileName: string,
  size: number,
  type: string,
): Promise<{ ok: true; id: string; path: string; token: string } | { ok: false; error: string }> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false, error: "Please sign in again." }
  if (type !== "application/pdf" && !/\.pdf$/i.test(fileName)) return { ok: false, error: "Pick a PDF file." }
  if (size > MAX_BYTES) return { ok: false, error: "That PDF is over 15 MB. Try a smaller one." }
  const id = crypto.randomUUID()
  const path = `templates/${userId}/${id}.pdf`
  const admin = createAdminClient()
  const { data: up, error: upErr } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (upErr || !up) return { ok: false, error: "Couldn’t start the upload. Try again." }
  const { error } = await supabase
    .from("pdf_templates")
    .insert({ id, agent_id: userId, title: (title.trim() || fileName.replace(/\.pdf$/i, "")).slice(0, 120), file_path: path })
  if (error) {
    const code = (error as { code?: string }).code
    return { ok: false, error: code === "42P01" || code === "PGRST205" ? "PDF forms aren’t switched on yet." : "Couldn’t save it. Try again." }
  }
  return { ok: true, id, path, token: up.token }
}

// Where the blanks sit on the form.
export async function savePdfFields(id: string, fields: PdfField[]): Promise<{ ok: boolean }> {
  const { supabase, userId } = await me()
  if (!userId) return { ok: false }
  const clean = (fields ?? []).slice(0, 200).map((f) => ({
    id: String(f.id).slice(0, 40),
    key: String(f.key).slice(0, 80),
    label: String(f.label).slice(0, 80),
    page: Math.max(0, Math.floor(Number(f.page) || 0)),
    x: clamp(f.x),
    y: clamp(f.y),
    w: clamp(f.w),
    h: clamp(f.h),
    size: Math.min(24, Math.max(6, Number(f.size) || 11)),
    cover: !!f.cover,
  }))
  const { error } = await supabase.from("pdf_templates").update({ fields: clean }).eq("id", id).eq("agent_id", userId)
  if (error) return { ok: false }
  revalidatePath("/templates")
  return { ok: true }
}

export async function deletePdfTemplate(id: string): Promise<void> {
  const { supabase, userId } = await me()
  if (!userId) return
  const { data } = await supabase.from("pdf_templates").select("file_path").eq("id", id).eq("agent_id", userId).maybeSingle()
  if (!data) return
  await supabase.from("pdf_templates").delete().eq("id", id).eq("agent_id", userId)
  await createAdminClient().storage.from(BUCKET).remove([data.file_path as string])
  revalidatePath("/templates")
}

function clamp(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}
