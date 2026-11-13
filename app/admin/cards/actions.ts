"use server"

import { revalidatePath } from "next/cache"
import { randomBytes, randomUUID } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { slugify, uniqueSlug, AGENT_DEFAULTS } from "@/lib/agent"
import { uploadImage } from "@/lib/branding"
import { igHandle } from "@/lib/instagram"

async function guard() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  return !!user && isAdminEmail(user.email)
}

const t = (f: FormData, k: string, n = 200) => String(f.get(k) ?? "").trim().slice(0, n)

// Make a gift card for an agent before she signs up. It stays private, behind
// its claim link, until she claims it with her own email and password.
export async function createGiftCard(_prev: { error: string } | null, f: FormData): Promise<{ error: string }> {
  if (!(await guard())) return { error: "Team only." }
  const fullName = t(f, "fullName", 120)
  if (!fullName) return { error: "Enter her name." }

  const admin = createAdminClient()
  const placeholder = `gift-${randomUUID()}@claim.marvberry.com`
  const { data: created, error } = await admin.auth.admin.createUser({ email: placeholder, password: randomBytes(24).toString("base64url"), email_confirm: true })
  if (error || !created.user) return { error: "Couldn’t make the card. Try again." }
  const id = created.user.id
  const slug = await uniqueSlug(slugify(fullName))
  const { error: rowErr } = await admin.from("agents").insert({
    id,
    full_name: fullName,
    business_name: t(f, "brokerage", 120) || fullName,
    slug,
    plan: "card",
    trial_ends_at: null,
    claim_token: randomBytes(18).toString("base64url"),
    gifted_at: new Date().toISOString(),
    tagline: t(f, "tagline", 160),
    public_phone: t(f, "phone", 40),
    public_email: t(f, "email", 200).toLowerCase(),
    show_contact: true,
    service_areas: t(f, "areas", 120) || null,
    office_address: String(f.get("address") ?? "").trim().slice(0, 200) || null,
    office_phone: t(f, "officePhone", 40) || null,
    website_url: t(f, "website", 300) || null,
    instagram: igHandle(t(f, "instagram", 300)) || null,
    timezone: AGENT_DEFAULTS.timezone,
    weekdays: AGENT_DEFAULTS.weekdays,
    day_start: AGENT_DEFAULTS.startHour,
    day_end: AGENT_DEFAULTS.endHour,
    slot_minutes: AGENT_DEFAULTS.slotMinutes,
    days_ahead: AGENT_DEFAULTS.daysAhead,
    min_notice_hours: AGENT_DEFAULTS.minNoticeHours,
  })
  if (rowErr) {
    await admin.auth.admin.deleteUser(id)
    return { error: "Couldn’t make the card. Try again." }
  }
  try {
    const photo = f.get("photo")
    const url = await uploadImage(id, "headshot", photo instanceof File ? photo : null)
    if (url) await admin.from("agents").update({ headshot_url: url }).eq("id", id)
  } catch (e) {
    revalidatePath("/admin/cards")
    return { error: `Card made, but the photo didn’t upload: ${(e as Error).message}` }
  }
  revalidatePath("/admin/cards")
  return { error: "" }
}

// Remove a gift card nobody claimed.
export async function deleteGiftCard(id: string): Promise<void> {
  if (!(await guard())) return
  const admin = createAdminClient()
  const { data } = await admin.from("agents").select("claim_token").eq("id", id).maybeSingle()
  if (!data?.claim_token) return
  await admin.auth.admin.deleteUser(id)
  revalidatePath("/admin/cards")
}

// Change a gift card after it's made. A new photo replaces the old one.
export async function updateGiftCard(id: string, _prev: { error: string } | null, f: FormData): Promise<{ error: string }> {
  if (!(await guard())) return { error: "Team only." }
  const fullName = t(f, "fullName", 120)
  if (!fullName) return { error: "Enter her name." }
  const admin = createAdminClient()
  const { data: card } = await admin.from("agents").select("gifted_at").eq("id", id).maybeSingle()
  if (!card?.gifted_at) return { error: "That card isn’t a gift card." }
  const { error } = await admin
    .from("agents")
    .update({
      full_name: fullName,
      business_name: t(f, "brokerage", 120) || fullName,
      tagline: t(f, "tagline", 160),
      public_phone: t(f, "phone", 40),
      public_email: t(f, "email", 200).toLowerCase(),
      service_areas: t(f, "areas", 120) || null,
      office_address: String(f.get("address") ?? "").trim().slice(0, 200) || null,
      office_phone: t(f, "officePhone", 40) || null,
      website_url: t(f, "website", 300) || null,
      instagram: igHandle(t(f, "instagram", 300)) || null,
    })
    .eq("id", id)
  if (error) return { error: "Couldn’t save. Try again." }
  try {
    const photo = f.get("photo")
    const url = await uploadImage(id, "headshot", photo instanceof File ? photo : null)
    if (url) await admin.from("agents").update({ headshot_url: url }).eq("id", id)
  } catch (e) {
    return { error: `Saved, but the photo didn’t upload: ${(e as Error).message}` }
  }
  revalidatePath("/admin/cards")
  return { error: "" }
}
