"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { STAGES, type Stage } from "./stages"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error("Not allowed")
  return createAdminClient()
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null

export async function addLead(f: FormData) {
  const db = await requireAdmin()
  const name = str(f, "name")
  if (!name) return
  const message = str(f, "message")
  const { data } = await db
    .from("pipeline_leads")
    .insert({
      name,
      phone: str(f, "phone"),
      brokerage: str(f, "brokerage"),
      town: str(f, "town"),
      source: str(f, "source"),
      kind: f.get("kind") === "broker" ? "broker" : "solo",
      hook: str(f, "hook"),
      message,
      next_follow_up: str(f, "next_follow_up"),
    })
    .select("id")
    .single()
  if (data) await db.from("pipeline_touches").insert({ lead_id: data.id, note: message ? "Texted: " + message : "Texted" })
  revalidatePath("/admin/pipeline")
}

// Moving forward stamps every stage up to this one (first time only), so the
// numbers bar counts how far each lead got, even after Lost.
const STAMP: Partial<Record<Stage, string>> = {
  replied: "replied_at", yes: "yes_at", sent: "sent_at", claimed: "claimed_at", active: "active_at", paid: "paid_at", lost: "lost_at",
}

export async function moveLead(id: string, stage: Stage): Promise<string | void> {
  const db = await requireAdmin()
  if (!STAGES.includes(stage)) return
  const { data: lead } = await db.from("pipeline_leads").select("*").eq("id", id).maybeSingle()
  if (!lead || lead.stage === stage) return
  const now = new Date().toISOString()
  const patch: Record<string, string> = { stage }
  const upTo = stage === "lost" ? ["lost"] : STAGES.slice(1, STAGES.indexOf(stage) + 1)
  for (const s of upTo) {
    const col = STAMP[s as Stage]
    if (col && !lead[col]) patch[col] = now
  }
  const { error } = await db.from("pipeline_leads").update(patch).eq("id", id)
  revalidatePath("/admin/pipeline")
  if (error) return "Couldn't move her: " + error.message
}

export async function updateLead(id: string, f: FormData): Promise<string | void> {
  const db = await requireAdmin()
  const name = str(f, "name")
  if (!name) return
  const agentId = str(f, "agent_id")
  const { data: before } = await db.from("pipeline_leads").select("agent_id, stage").eq("id", id).maybeSingle()
  const { error: saveErr } = await db
    .from("pipeline_leads")
    .update({
      name,
      phone: str(f, "phone"),
      brokerage: str(f, "brokerage"),
      town: str(f, "town"),
      source: str(f, "source"),
      kind: f.get("kind") === "broker" ? "broker" : "solo",
      hook: str(f, "hook"),
      message: str(f, "message"),
      notes: str(f, "notes"),
      next_follow_up: str(f, "next_follow_up"),
      agent_id: agentId,
    })
    .eq("id", id)
  if (saveErr) return "Couldn't save: " + saveErr.message
  // Linking her card means it's been sent; if she already claimed it, say so.
  if (agentId && before && ["texted", "replied", "yes", "sent"].includes(before.stage)) {
    const { data: card } = await db.from("agents").select("claim_token").eq("id", agentId).maybeSingle()
    const to: Stage = card && !card.claim_token ? "claimed" : "sent"
    if (to !== before.stage) {
      const err = await moveLead(id, to)
      if (err) return err
      await db.from("pipeline_touches").insert({ lead_id: id, note: to === "sent" ? "Sent her card" : "Linked her claimed card" })
    }
  }
  revalidatePath("/admin/pipeline")
}

export async function logTouch(id: string, note: string) {
  const db = await requireAdmin()
  const text = note.trim()
  if (!text) return
  await db.from("pipeline_touches").insert({ lead_id: id, note: text })
  await db.from("pipeline_leads").update({ last_contact_at: new Date().toISOString() }).eq("id", id)
  revalidatePath("/admin/pipeline")
}

export async function deleteLead(id: string) {
  const db = await requireAdmin()
  await db.from("pipeline_leads").delete().eq("id", id)
  revalidatePath("/admin/pipeline")
}
