"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Create a new template, then open its editor.
export async function createTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const title = String(formData.get("title") ?? "").trim() || "Untitled template"
  const body = String(formData.get("body") ?? "")

  const { data, error } = await supabase
    .from("document_templates")
    .insert({ agent_id: user.id, title, body })
    .select("id")
    .single()

  if (error || !data) {
    redirect("/templates?error=save")
  }

  revalidatePath("/templates")
  redirect(`/templates/edit?id=${data.id}&saved=1`)
}

// Update an existing template's wording.
export async function updateTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "").trim() || "Untitled template"
  const body = String(formData.get("body") ?? "")

  const { error } = await supabase
    .from("document_templates")
    .update({ title, body })
    .eq("id", id)

  if (error) {
    redirect(`/templates/edit?id=${id}&error=save`)
  }

  revalidatePath("/templates")
  revalidatePath(`/templates/edit`)
  redirect(`/templates/edit?id=${id}&saved=1`)
}
