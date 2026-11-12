"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { checkEmail } from "@/lib/email-check"
import { sendEmail } from "@/lib/email"
import { siteUrl } from "@/lib/stripe"

// What visitors do on an agent's card. Quietly does nothing if the card tables
// aren't set up yet, so the booking page never breaks.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

export async function logCardEvent(slug: string, kind: "view" | "share"): Promise<void> {
  if (kind !== "view" && kind !== "share") return
  try {
    const agent = await getAgentBySlug(slug)
    if (agent) await createAdminClient().from("card_events").insert({ agent_id: agent.id, kind })
  } catch {}
}

export type RequestResult = { ok: true; guide: boolean } | { ok: false; error: string }

export async function requestContact(slug: string, formData: FormData): Promise<RequestResult> {
  const agent = await getAgentBySlug(slug)
  if (!agent) return { ok: false, error: "This card is no longer available." }
  if (String(formData.get("website") ?? "")) return { ok: true, guide: false } // bots fill hidden fields

  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200)
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40)
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000)
  const wantsGuide = formData.get("guide") === "1"
  if (!name) return { ok: false, error: "Enter your name." }
  if (!email) return { ok: false, error: "Enter your email." }
  const problem = await checkEmail(email)
  if (problem) return { ok: false, error: problem }

  const admin = createAdminClient()
  const { data: extra } = await admin.from("agents").select("guide_title, guide_url").eq("id", agent.id).maybeSingle()
  const { data: extra2 } = await admin.from("agents").select("guide_path").eq("id", agent.id).maybeSingle()
  const guideUrl = extra2?.guide_path || extra?.guide_url ? `${siteUrl()}/book/${agent.slug}/guide` : ""
  const guideTitle = ((extra?.guide_title as string) || "").trim() || "Your guide"
  const { error } = await admin.from("card_requests").insert({
    agent_id: agent.id,
    name,
    email,
    phone: phone || null,
    message: message || null,
    wants_guide: wantsGuide && !!guideUrl,
  })
  if (error) return { ok: false, error: "That didn’t go through. Try again." }
  await admin.from("card_events").insert({ agent_id: agent.id, kind: "request" })

  const agentName = agent.full_name || agent.business_name || "Your agent"
  const first = agentName.split(" ")[0]
  // The guide goes to the visitor right away.
  if (wantsGuide && guideUrl) {
    await sendEmail({
      to: email,
      subject: guideTitle,
      fromName: agentName,
      replyTo: agent.public_email || undefined,
      text: `Hi ${name.split(" ")[0]},\n\nHere’s ${guideTitle}: ${guideUrl}\n\n${first} will be in touch soon.\n\n${agentName}`,
      html: `<p>Hi ${esc(name.split(" ")[0])},</p><p>Here’s <a href="${esc(guideUrl)}">${esc(guideTitle)}</a>.</p><p>${esc(first)} will be in touch soon.</p><p>${esc(agentName)}</p>`,
    })
  }
  // The agent hears about it right away.
  try {
    const { data: owner } = await admin.auth.admin.getUserById(agent.id)
    const to = owner?.user?.email || agent.public_email
    if (to) {
      const what = wantsGuide && guideUrl ? `asked for ${guideTitle}` : "asked you to reach out"
      const lines = [`${name} ${what} from your card.`, `Email: ${email}`, phone ? `Phone: ${phone}` : "", message ? `\n“${message}”` : ""].filter(Boolean)
      await sendEmail({
        to,
        subject: `${name} ${what}`,
        replyTo: email,
        text: `${lines.join("\n")}\n\nReply to this email to answer them. It stays on your dashboard until you do: ${siteUrl()}/dashboard`,
        html: `<p>${lines.map(esc).join("<br>")}</p><p>Reply to this email to answer them. It stays on <a href="${siteUrl()}/dashboard">your dashboard</a> until you do.</p>`,
      })
    }
  } catch {}
  return { ok: true, guide: wantsGuide && !!guideUrl }
}
