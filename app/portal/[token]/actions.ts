"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The client replies from their portal. The token in the link is their key.
export async function clientSendMessage(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!UUID_RE.test(token)) redirect("/")
  if (!body) redirect(`/portal/${token}`)

  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("id, agent_id")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) redirect("/")

  const { error } = await admin.from("messages").insert({
    agent_id: client.agent_id,
    client_id: client.id,
    sender: "client",
    body: body.slice(0, 4000),
  })
  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${client.id}`)
  redirect(`/portal/${token}${error ? "?error=msg" : ""}#messages`)
}
