import "server-only"
import { randomBytes } from "node:crypto"
import { createAdminClient } from "./supabase/admin"

// marvberry.com/c/kim-x7k2q: her first name plus five random letters, so the
// link is short but can't be guessed. Made once, then kept.
const ABC = "abcdefghjkmnpqrstuvwxyz23456789"

function code(name: string) {
  const first = (name.trim().split(/\s+/)[0] || "card").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 12) || "card"
  const tail = [...randomBytes(5)].map((b) => ABC[b % ABC.length]).join("")
  return `${first}-${tail}`
}

export async function shortCodeFor(agentId: string, name: string): Promise<string> {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from("agents").select("short_code").eq("id", agentId).maybeSingle()
    if (error) return ""
    if (data?.short_code) return data.short_code as string
    for (let i = 0; i < 3; i++) {
      const c = code(name)
      const { error: e } = await db.from("agents").update({ short_code: c }).eq("id", agentId).is("short_code", null)
      if (!e) return c
    }
  } catch {}
  return ""
}

export async function agentByShortCode(c: string): Promise<{ id: string; slug: string; claim_token: string | null } | null> {
  if (!/^[a-z]{1,12}-[a-z0-9]{5}$/.test(c)) return null
  try {
    const { data } = await createAdminClient().from("agents").select("id, slug, claim_token").eq("short_code", c).maybeSingle()
    return (data as { id: string; slug: string; claim_token: string | null }) ?? null
  } catch {
    return null
  }
}
