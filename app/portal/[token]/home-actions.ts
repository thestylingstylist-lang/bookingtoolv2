"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { teamNote, esc } from "@/lib/letter"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PortalHomeResult = { ok: boolean; message: string }

// The token in the link is the client's key. Only homes on their own deal.
async function homeFor(token: string, homeId: string) {
  if (!UUID_RE.test(token) || !UUID_RE.test(homeId)) return null
  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("id, agent_id, first_name, last_name")
    .eq("portal_token", token)
    .maybeSingle()
  if (!client) return null
  const { data: home } = await admin
    .from("homes")
    .select("id, address")
    .eq("id", homeId)
    .eq("client_id", client.id)
    .maybeSingle()
  if (!home) return null
  return { admin, client, home }
}

export async function saveClientNotes(_: PortalHomeResult | null, formData: FormData): Promise<PortalHomeResult> {
  const token = String(formData.get("token") ?? "")
  const found = await homeFor(token, String(formData.get("homeId") ?? ""))
  if (!found) return { ok: false, message: "That didn't save. Please try again." }
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000)
  const { error } = await found.admin.from("homes").update({ client_notes: notes }).eq("id", found.home.id)
  if (error) return { ok: false, message: "That didn't save. Please try again." }
  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${found.client.id}`)
  return { ok: true, message: "Saved." }
}

// The client taps "I'd like to make an offer". Nothing goes to the seller.
// It tells their agent right away: a message in the thread and an email.
export async function askForOffer(_: PortalHomeResult | null, formData: FormData): Promise<PortalHomeResult> {
  const token = String(formData.get("token") ?? "")
  const found = await homeFor(token, String(formData.get("homeId") ?? ""))
  if (!found) return { ok: false, message: "That didn't go through. Please try again." }
  const { admin, client, home } = found

  const { error } = await admin.from("homes").update({ client_offer_at: new Date().toISOString() }).eq("id", home.id)
  if (error) return { ok: false, message: "That didn't go through. Please try again." }

  const street = (home.address as string).split(",")[0]
  await admin.from("messages").insert({
    agent_id: client.agent_id,
    client_id: client.id,
    sender: "client",
    body: `I'd like to make an offer on ${street}.`,
  })

  const { data: u } = await admin.auth.admin.getUserById(client.agent_id as string)
  const to = u?.user?.email
  const name = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "Your client"
  const first = (client.first_name as string | null)?.trim() || name
  if (to) {
    const link = `https://www.marvberry.com/clients/${client.id}`
    const p = (s: string) =>
      `<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#4a433b;">${s}</p>`
    await sendEmail({
      to,
      subject: `${name} wants to make an offer on ${street}`,
      fromName: "Marvberry",
      html: teamNote(
        `${esc(first)} wants to make an offer.`,
        p(`${esc(name)} tapped &ldquo;I&rsquo;d like to make an offer&rdquo; on <strong>${esc(home.address as string)}</strong> from their page.`) +
          p(`Nothing has gone to the listing agent. Open their page to put the offer together.`) +
          `<a href="${link}" style="display:inline-block;margin-top:6px;background:#2a221c;color:#f6efe5;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;padding:12px 22px;border-radius:999px;">Open ${esc(first)}&rsquo;s page</a>`,
      ),
      text: `${name} tapped "I'd like to make an offer" on ${home.address} from their page.\n\nNothing has gone to the listing agent. Open their page to put the offer together:\n${link}`,
    })
  }

  revalidatePath(`/portal/${token}`)
  revalidatePath(`/clients/${client.id}`)
  return { ok: true, message: "Sent." }
}
