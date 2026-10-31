"use server"

import { randomInt } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { slugify, uniqueSlug } from "@/lib/agent"
import { DEMO_EMAIL, demoAgentRow, seedDemo } from "@/lib/demo"

export type DemoState = { ok: boolean; message: string; password?: string; slug?: string; problems?: string[] } | null

// Builds (or rebuilds) the demo login: demo@marvberry.com, a fresh password, and believable sample data.
export async function createDemo(_prev: DemoState, _formData: FormData): Promise<DemoState> {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false, message: "Only the Marvberry team can do this." }

  const admin = createAdminClient()

  // Start clean: remove the old demo login and everything in it.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const old = list?.users.find((u) => (u.email ?? "").toLowerCase() === DEMO_EMAIL)
  if (old) {
    for (const t of ["home_offers", "homes", "messages", "documents", "collected_docs", "steps", "events", "clients", "bookings"]) {
      try { await admin.from(t).delete().eq("agent_id", old.id) } catch {}
    }
    try { await admin.from("agents").delete().eq("id", old.id) } catch {}
    await admin.auth.admin.deleteUser(old.id)
  }

  const password = `Berry-${randomInt(100000, 999999)}`
  const { data: created, error } = await admin.auth.admin.createUser({ email: DEMO_EMAIL, password, email_confirm: true })
  if (error || !created.user) return { ok: false, message: "Couldn't create the demo login. Try again in a minute." }

  const slug = await uniqueSlug(slugify("Nicole Bennett"))
  const { error: rowErr } = await admin.from("agents").insert({ ...demoAgentRow(created.user.id), slug })
  if (rowErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, message: "Couldn't set up the demo agent. Try again in a minute." }
  }

  const problems = await seedDemo(admin, created.user.id)
  return {
    ok: true,
    message: problems.length ? "Demo account is ready, but a few pieces didn't load." : "Demo account is ready.",
    password,
    slug,
    problems,
  }
}
