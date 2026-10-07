"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { toKind } from "@/lib/events"

// The realtor puts a showing, closing or open house on the calendar.
// She picks the day, the start and the end. Marvberry doesn't decide the length.
export async function addEvent(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const kind = toKind(formData.get("kind"))
  const date = String(formData.get("date") ?? "")
  const start = String(formData.get("start") ?? "")
  const end = String(formData.get("end") ?? "")
  const place = String(formData.get("place") ?? "").trim().slice(0, 200)
  const clientId = String(formData.get("clientId") ?? "").trim()

  if (!kind || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    redirect("/calendar?error=details")
  }
  if (end <= start) redirect("/calendar?error=times")

  const { data: agent } = await supabase.from("agents").select("timezone").eq("id", user.id).maybeSingle()
  const tz = agent?.timezone || "America/New_York"

  const { error } = await supabase.from("events").insert({
    agent_id: user.id,
    client_id: clientId || null,
    kind,
    place,
    starts_at: fromZonedTime(`${date}T${start}:00`, tz).toISOString(),
    ends_at: fromZonedTime(`${date}T${end}:00`, tz).toISOString(),
  })
  if (error) {
    const code = (error as { code?: string }).code
    redirect(code === "42P01" || code === "PGRST205" ? "/calendar?error=setup" : "/calendar?error=save")
  }

  revalidatePath("/calendar")
  redirect("/calendar?added=1")
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const id = String(formData.get("id") ?? "").trim()
  if (id) await supabase.from("events").delete().eq("id", id).eq("agent_id", user.id)
  revalidatePath("/calendar")
  redirect("/calendar?removed=1")
}
