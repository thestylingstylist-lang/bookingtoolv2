"use server"

import { randomUUID } from "crypto"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import { portalLinkEmail } from "@/lib/portal-email"

const SITE = "https://www.marvberry.com"

// Email the client their private portal link.
export async function sendPortalLink(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const clientId = String(formData.get("clientId") ?? "")
  if (!clientId) redirect("/clients")

  const [{ data: client }, { data: agent }] = await Promise.all([
    supabase.from("clients").select("first_name, email, portal_token").eq("id", clientId).maybeSingle(),
    supabase.from("agents").select("full_name, business_name").eq("id", user.id).maybeSingle(),
  ])
  if (!client) redirect("/clients")
  if (!client.email) redirect(`/clients/${clientId}?doc=portalnoemail`)

  // A client without a private code would get a dead link, so give them one first.
  let token = client.portal_token as string | null
  if (!token) {
    token = randomUUID()
    const { error } = await supabase.from("clients").update({ portal_token: token }).eq("id", clientId)
    if (error) redirect(`/clients/${clientId}?doc=portalfail`)
  }

  // Always the real site, never whatever address the realtor happened to be on.
  const link = `${SITE}/portal/${token}`

  const agentName = agent?.full_name || agent?.business_name || "Your agent"
  const mail = portalLinkEmail({ clientFirstName: client.first_name ?? "", agentName, link })
  const ok = await sendEmail({
    to: client.email,
    ...mail,
    fromName: agentName,
    replyTo: user.email ?? undefined,
  })
  redirect(`/clients/${clientId}?doc=${ok ? "portalsent" : "portalfail"}`)
}
