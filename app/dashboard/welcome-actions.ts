"use server"
import { createClient } from "@/lib/supabase/server"
import { uploadImage } from "@/lib/branding"

// Everything the onboarding chat saves. Each one quietly does nothing if
// the agent isn't signed in, so the chat never stalls on a save.
async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, id: user?.id ?? null }
}

// What the agent calls their assistant (needs supabase/assistant-name.sql).
export async function saveAssistantName(name: string) {
  const clean = name.trim().slice(0, 30)
  const { supabase, id } = await me()
  if (!clean || !id) return
  await supabase.from("agents").update({ assistant_name: clean }).eq("id", id)
}

export async function saveBrokerage(name: string) {
  const clean = name.trim().slice(0, 120)
  const { supabase, id } = await me()
  if (!clean || !id) return
  await supabase.from("agents").update({ business_name: clean }).eq("id", id)
}

// Phone on the booking page (optional).
export async function savePhone(phone: string) {
  const clean = phone.trim().slice(0, 40)
  const { supabase, id } = await me()
  if (!clean || !id) return
  await supabase.from("agents").update({ public_phone: clean, show_contact: true }).eq("id", id)
}

// Photo or logo. Returns the new image address, or an error to show in the chat.
export async function uploadBrandImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const kind = formData.get("kind") === "logo" ? "logo" : "headshot"
  const { supabase, id } = await me()
  if (!id) return { error: "Please sign in again." }
  try {
    const url = await uploadImage(id, kind, formData.get("file") as File | null)
    if (!url) return { error: "Pick an image first." }
    await supabase
      .from("agents")
      .update(kind === "logo" ? { logo_url: url } : { headshot_url: url })
      .eq("id", id)
    return { url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't upload that. Try another image." }
  }
}

// Working hours: ISO weekdays (1 = Mon … 7 = Sun) and whole hours.
export async function saveHours(weekdays: number[], start: number, end: number) {
  const days = [...new Set(weekdays)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort()
  if (!days.length || !(start >= 0 && end <= 24 && end > start)) return
  const { supabase, id } = await me()
  if (!id) return
  await supabase.from("agents").update({ weekdays: days, day_start: start, day_end: end }).eq("id", id)
}

// Drafted replies on or off (the same switch as Settings › Assistant).
export async function saveReplies(on: boolean) {
  const { supabase, id } = await me()
  if (!id) return
  await supabase.from("agents").update({ assistant_replies: on }).eq("id", id)
}
