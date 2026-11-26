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
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer())
  if (kind === "logo" && ext !== "gif") bytes = await trimEdges(bytes)

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from("branding")
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) throw new Error(`Couldn't upload your ${kind}. Please try again.`)

  const { data } = admin.storage.from("branding").getPublicUrl(path)
  // Cache-bust so a re-uploaded image at the same path shows immediately.
  return `${data.publicUrl}?v=${Date.now()}`
}

// Logos often arrive with empty or transparent space around them, which makes
// them display small. Trim it, keeping a hair of breathing room. If anything
// goes wrong, the original is kept.
async function trimEdges(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const sharp = (await import("sharp")).default
    const img = sharp(Buffer.from(bytes), { failOn: "none" })
    const meta = await img.metadata()
    const { data, info } = await img.clone().trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })
    // Nothing worth trimming, or the trim ate the whole image.
    if (!info.width || !info.height || (info.width === meta.width && info.height === meta.height)) return bytes
    if (info.width < 8 || info.height < 8) return bytes
    const pad = Math.max(2, Math.round(Math.min(info.width, info.height) * 0.02))
    const out = await sharp(data)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFormat(meta.format === "jpeg" ? "jpeg" : meta.format === "webp" ? "webp" : "png")
      .toBuffer()
    return new Uint8Array(out)
  } catch (e) {
    console.error("[branding] trim skipped", e)
    return bytes
  }
}

// A home's photo for the client's card: straightened, sized for the card, saved in the
// public "branding" bucket under the agent's folder. Returns its public URL.
export async function uploadHomePhoto(userId: string, homeId: string, file: File | null): Promise<string> {
  if (!file || file.size === 0) throw new Error("Choose a photo first.")
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WEBP photo.")
  if (file.size > 4 * 1024 * 1024) throw new Error("That photo is too large. Try another.")
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer())
  try {
    const sharp = (await import("sharp")).default
    const out = await sharp(Buffer.from(bytes), { failOn: "none" })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer()
    bytes = new Uint8Array(out)
  } catch (e) {
    console.error("[branding] home photo resize skipped", e)
  }
  const path = `${userId}/homes/${homeId}-${Date.now()}.jpg`
  const admin = createAdminClient()
  const { error } = await admin.storage.from("branding").upload(path, bytes, { contentType: "image/jpeg", upsert: true })
  if (error) throw new Error("Couldn't upload the photo. Please try again.")
  return admin.storage.from("branding").getPublicUrl(path).data.publicUrl
}
