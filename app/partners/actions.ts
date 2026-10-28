"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { SOCIALS } from "@/lib/partners"

export type ApplyState = { ok: boolean; message: string } | null

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

// Someone applies to be a partner. Alecia reviews it in Admin > Partners.
export async function applyPartner(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200)
  const kind = String(formData.get("kind") ?? "") === "coach" ? "coach" : "influencer"
  // Their handles and links, one per line, e.g. "Instagram: @dana".
  const lines = SOCIALS.map((s) => [s.label, String(formData.get(s.key) ?? "").trim().slice(0, 200)] as const).filter(([, v]) => v)
  const audience = lines.map(([l, v]) => `${l}: ${v}`).join("\n")
  const hasSocial = lines.some(([l]) => l !== "Anywhere else")
  const pitch = String(formData.get("pitch") ?? "").trim().slice(0, 1500)
  const agree = formData.get("agree") === "on"

  if (!name) return { ok: false, message: "Enter your name." }
  if (!emailRe.test(email)) return { ok: false, message: "That email doesn't look right. Check it and try again." }
  if (!hasSocial) return { ok: false, message: "Add at least one social handle or your website, so we can see where you'd share Marvberry." }
  if (!agree) return { ok: false, message: "Please agree to the partner terms." }

  const admin = createAdminClient()
  const { data: existing } = await admin.from("partners").select("id, status").ilike("email", email).maybeSingle()
  if (existing) return { ok: true, message: "You've already applied. We'll be in touch soon." }

  const { error } = await admin.from("partners").insert({ name, email, kind, audience, pitch })
  if (error) return { ok: false, message: "We couldn't save your application. Please try again." }

  try {
    await sendEmail({
      to: "team@marvberry.com",
      subject: `New partner application: ${name}`,
      html: `<p><strong>${esc(name)}</strong> (${esc(email)}) applied as ${kind === "coach" ? "a real estate coach" : "an agent influencer"}.</p><p>${esc(audience).replace(/\n/g, "<br>")}</p><p>${esc(pitch)}</p><p><a href="https://www.marvberry.com/admin/partners">Review it in Admin</a></p>`,
      text: `${name} (${email}) applied as ${kind}.\n${audience}\n\n${pitch}\n\nReview: https://www.marvberry.com/admin/partners`,
      fromName: "Marvberry",
      replyTo: email,
    })
    await sendEmail({
      to: email,
      subject: "We got your Marvberry partner application",
      html: `<p>Hi ${esc(name.split(" ")[0])},</p><p>Thanks for applying to the Marvberry partner program. I'll look it over and get back to you within a couple of days. Once you're approved, you'll get your own link and a page to track it.</p><p>Alecia<br>Founder, Marvberry</p>`,
      text: `Hi ${name.split(" ")[0]},\n\nThanks for applying to the Marvberry partner program. I'll look it over and get back to you within a couple of days. Once you're approved, you'll get your own link and a page to track it.\n\nAlecia\nFounder, Marvberry`,
      fromName: "Alecia at Marvberry",
      replyTo: "team@marvberry.com",
    })
  } catch {}

  return { ok: true, message: "Thanks! We'll look it over and email you within a couple of days." }
}
