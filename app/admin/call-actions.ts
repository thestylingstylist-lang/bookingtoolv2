"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { formatSlot } from "@/lib/slots"
import { sendEmail, chatConfirmationEmail } from "@/lib/email"
import { CHAT_CFG, CHAT_HOST, CHAT_ZOOM } from "@/app/chat/config"

// Resend a setup-call confirmation (with the Zoom link) to the person who booked.
export async function resendCallLink(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")

  const id = String(formData.get("leadId") ?? "")
  const admin = createAdminClient()
  const { data: lead } = await admin.from("sales_leads").select("name, email, call_at, notes").eq("id", id).maybeSingle()
  if (!lead?.email || !lead.call_at) redirect("/admin?resent=fail")

  const c = chatConfirmationEmail({
    clientFirstName: String(lead.name || "").trim().split(/\s+/)[0] || "there",
    whenLabel: formatSlot(lead.call_at as string, CHAT_CFG.timezone),
    meetingType: /phone call/i.test((lead.notes as string) ?? "") ? "phone" : "virtual",
    zoom: CHAT_ZOOM,
  })
  const ok = await sendEmail({
    to: lead.email as string,
    subject: c.subject,
    html: c.html,
    text: c.text,
    fromName: "Alecia at Marvberry",
    replyTo: CHAT_HOST.email,
  })
  redirect(`/admin?resent=${ok ? "ok" : "fail"}`)
}
