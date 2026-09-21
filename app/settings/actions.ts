"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { TIMEZONES } from "@/lib/config"

export type SettingsResult = { ok: boolean; message: string }

const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"]

// Upload one image to the public "branding" bucket and return its public URL.
// Returns null if no file was provided; throws a short message on a bad file.
async function uploadImage(
  userId: string,
  kind: "logo" | "headshot",
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null
  if (!ALLOWED_IMAGE.includes(file.type))
    throw new Error(`Your ${kind} must be a PNG, JPG, WEBP or GIF image.`)
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error(`Your ${kind} image is too large (max 3 MB).`)

  const ext = file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : file.type === "image/gif" ? "gif"
    : "jpg"
  const path = `${userId}/${kind}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from("branding")
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) throw new Error(`Couldn't upload your ${kind}. Please try again.`)

  const { data } = admin.storage.from("branding").getPublicUrl(path)
  // Cache-bust so a re-uploaded image at the same path shows immediately.
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function saveSettings(
  _prev: SettingsResult | null,
  formData: FormData
): Promise<SettingsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const businessName = String(formData.get("businessName") ?? "").trim()
  const fullName = String(formData.get("fullName") ?? "").trim()
  const timezone = String(formData.get("timezone") ?? "").trim()
  const dayStart = Number(formData.get("dayStart"))
  const dayEnd = Number(formData.get("dayEnd"))
  const slotMinutes = Number(formData.get("slotMinutes"))
  const daysAhead = Number(formData.get("daysAhead"))
  const weekdays = formData
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => n >= 1 && n <= 7)

  // Branding text
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim().slice(0, 600)
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 120)
  const publicPhone = String(formData.get("publicPhone") ?? "").trim().slice(0, 40)
  const publicEmail = String(formData.get("publicEmail") ?? "").trim().slice(0, 120)

  if (!businessName) return { ok: false, message: "Business name can't be empty." }
  if (!(TIMEZONES as readonly string[]).includes(timezone))
    return { ok: false, message: "Pick a timezone from the list." }
  if (weekdays.length === 0)
    return { ok: false, message: "Choose at least one working day." }
  if (!(dayEnd > dayStart))
    return { ok: false, message: "End time must be after start time." }
  if (![15, 30, 45, 60].includes(slotMinutes))
    return { ok: false, message: "Pick a valid slot length." }
  if (daysAhead < 1 || daysAhead > 60)
    return { ok: false, message: "Booking window must be between 1 and 60 days." }
  if (publicEmail && !publicEmail.includes("@"))
    return { ok: false, message: "That public email doesn't look right." }

  // Image uploads (optional). A bad file returns a friendly message.
  let logoUrl: string | null = null
  let headshotUrl: string | null = null
  try {
    logoUrl = await uploadImage(user.id, "logo", formData.get("logo") as File | null)
    headshotUrl = await uploadImage(user.id, "headshot", formData.get("headshot") as File | null)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Image upload failed." }
  }

  const update: Record<string, unknown> = {
    business_name: businessName,
    full_name: fullName,
    timezone,
    weekdays,
    day_start: dayStart,
    day_end: dayEnd,
    slot_minutes: slotMinutes,
    days_ahead: daysAhead,
    welcome_message: welcomeMessage,
    tagline,
    public_phone: publicPhone,
    public_email: publicEmail,
  }
  // Only overwrite an image URL when a new file was actually uploaded.
  if (logoUrl) update.logo_url = logoUrl
  if (headshotUrl) update.headshot_url = headshotUrl

  const { error } = await supabase.from("agents").update(update).eq("id", user.id)
  if (error) return { ok: false, message: "Couldn't save. Please try again." }

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true, message: "Saved." }
}

// Remove an uploaded logo or headshot.
export async function removeImage(kind: "logo" | "headshot"): Promise<SettingsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const column = kind === "logo" ? "logo_url" : "headshot_url"
  const { error } = await supabase
    .from("agents")
    .update({ [column]: "" })
    .eq("id", user.id)
  if (error) return { ok: false, message: "Couldn't remove it. Please try again." }

  revalidatePath("/settings")
  return { ok: true, message: `Removed your ${kind}.` }
}
