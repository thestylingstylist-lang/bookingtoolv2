import "server-only"
import { createAdminClient } from "./supabase/admin"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"]

// Upload one image to the public "branding" bucket and return its public URL.
// Returns null if no file was provided; throws a short message on a bad file.
export async function uploadImage(
  userId: string,
  kind: "logo" | "headshot",
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null
  if (!ALLOWED_IMAGE.includes(file.type))
    throw new Error(`Your ${kind} must be a PNG, JPG, WEBP or GIF image.`)
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error(`Your ${kind} image is too large (max 5 MB).`)

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
