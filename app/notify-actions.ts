"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pushTo } from "@/lib/notify"

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

async function me() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Saves this browser so notifications can reach it.
export async function saveSubscription(sub: Sub): Promise<{ ok: boolean }> {
  const user = await me()
  if (!user || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false }
  const admin = createAdminClient()
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      { agent_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" },
    )
  if (error) return { ok: false }
  await admin.from("agents").update({ notify_prompt: "on" }).eq("id", user.id)
  revalidatePath("/settings")
  return { ok: true }
}

export async function removeSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await me()
  if (!user || !endpoint) return { ok: false }
  await createAdminClient().from("push_subscriptions").delete().eq("agent_id", user.id).eq("endpoint", endpoint)
  revalidatePath("/settings")
  return { ok: true }
}

// "Not now": the band never asks again. Settings can still turn them on.
export async function declineNotify(): Promise<void> {
  const user = await me()
  if (!user) return
  await createAdminClient().from("agents").update({ notify_prompt: "declined" }).eq("id", user.id)
}

export async function sendTestNotification(): Promise<{ ok: boolean; message: string }> {
  const user = await me()
  if (!user) return { ok: false, message: "Your session ended. Sign in again." }
  const ok = await pushTo(createAdminClient(), user.id, {
    title: "Marvberry",
    body: "This is how your heads-ups will look. You're all set.",
    url: "/settings",
    tag: "test",
  })
  return ok
    ? { ok: true, message: "Test sent. It should appear in a moment." }
    : { ok: false, message: "That test didn't arrive. Turn notifications off and on again, then send another." }
}

export type NotifySettingsResult = { ok: boolean; message: string }

export async function saveNotifySettings(_prev: NotifySettingsResult | null, formData: FormData): Promise<NotifySettingsResult> {
  const user = await me()
  if (!user) return { ok: false, message: "Your session ended. Sign in again, then save." }
  const on = (k: string) => formData.get(k) === "on"
  const { error } = await createAdminClient()
    .from("agents")
    .update({
      notify_messages: on("messages"),
      notify_signed: on("signed"),
      notify_bookings: on("bookings"),
      notify_support: on("support"),
      notify_hours_only: on("hoursOnly"),
    })
    .eq("id", user.id)
  if (error) return { ok: false, message: "Notifications aren't switched on for your account yet. Message us from Support, and we'll turn them on." }
  revalidatePath("/settings")
  return { ok: true, message: "Saved." }
}
