"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import { portalLinkEmail } from "@/lib/portal-email"

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

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  const link = `${proto}://${host}/portal/${client.portal_token}`

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
