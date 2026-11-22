"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"

// The seller's side of a client: their home, open houses or private showings
// with a feedback note after each, and the offers they receive.
// All run as the logged-in agent under RLS.

async function agentOrLogin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, userId: user.id }
}

function back(clientId: string, error?: string): never {
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}?tab=tasks${error ? `&error=${error}` : ""}`)
}

const str = (v: FormDataEntryValue | null, max = 2000) => String(v ?? "").trim().slice(0, max)
function money(v: FormDataEntryValue | null) {
  const digits = String(v ?? "").replace(/[^0-9.]/g, "")
  const n = Number(digits)
  return digits && Number.isFinite(n) ? Math.min(n, 2_000_000_000) : null
}
const day = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null)

async function agentTz(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("agents").select("timezone").eq("id", userId).maybeSingle()
  return (data?.timezone as string) || "America/New_York"
}

export async function saveSaleHome(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const url = str(formData.get("url"), 600)
  const { error } = await supabase
    .from("clients")
    .update({
      sale_address: str(formData.get("address"), 300) || null,
      sale_price: money(formData.get("price")),
      sale_listed_on: day(formData.get("listedOn")),
      sale_url: /^https?:\/\//i.test(url) ? url : null,
    })
    .eq("id", clientId)
  back(clientId, error ? "seller" : undefined)
}

export async function setPrivateShowings(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const on = formData.get("on") === "1"
  const { error } = await supabase.from("clients").update({ private_showings: on }).eq("id", clientId)
  back(clientId, error ? "seller" : undefined)
}

export async function addOpenHouse(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const date = day(formData.get("date"))
  const start = str(formData.get("start"), 5)
  const end = str(formData.get("end"), 5)
  if (!clientId || !date || !/^\d{2}:\d{2}$/.test(start)) back(clientId, "openhouse")
  const tz = await agentTz(supabase, userId)
  const startsAt = fromZonedTime(`${date}T${start}:00`, tz).toISOString()
  const endsAt = /^\d{2}:\d{2}$/.test(end) ? fromZonedTime(`${date}T${end}:00`, tz).toISOString() : null
  const { error } = await supabase.from("open_houses").insert({
    agent_id: userId,
    client_id: clientId,
    starts_at: startsAt,
    ends_at: endsAt,
    kind: formData.get("kind") === "private" ? "private" : "open_house",
  })
  back(clientId, error ? "openhouse" : undefined)
}

export async function saveFeedback(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const id = str(formData.get("id"))
  const { error } = await supabase
    .from("open_houses")
    .update({ feedback: str(formData.get("feedback")) || null })
    .eq("id", id)
  back(clientId, error ? "openhouse" : undefined)
}

export async function deleteOpenHouse(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const { error } = await supabase.from("open_houses").delete().eq("id", str(formData.get("id")))
  back(clientId, error ? "openhouse" : undefined)
}

const STATUSES = ["review", "countered", "accepted", "declined"]

export async function addSaleOffer(formData: FormData): Promise<void> {
  const { supabase, userId } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const amount = money(formData.get("amount"))
  if (!clientId || !amount) back(clientId, "saleoffer")
  const row = {
    agent_id: userId,
    client_id: clientId,
    amount,
    terms: str(formData.get("terms"), 300) || null,
    note: str(formData.get("note")) || null,
    received_on: day(formData.get("receivedOn")) ?? new Date().toISOString().slice(0, 10),
  }
  const agent = {
    buyer_agent_name: str(formData.get("buyerAgentName"), 120) || null,
    buyer_agent_email: str(formData.get("buyerAgentEmail"), 200) || null,
  }
  let { error } = await supabase.from("sale_offers").insert({ ...row, ...agent })
  // Before the buyer's agent columns exist, still save the offer.
  if (error) ({ error } = await supabase.from("sale_offers").insert(row))
  back(clientId, error ? "saleoffer" : undefined)
}

export async function updateSaleOffer(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const status = str(formData.get("status"))
  const { error } = await supabase
    .from("sale_offers")
    .update({
      status: STATUSES.includes(status) ? status : "review",
      note: str(formData.get("note")) || null,
    })
    .eq("id", str(formData.get("id")))
  back(clientId, error ? "saleoffer" : undefined)
}

export async function deleteSaleOffer(formData: FormData): Promise<void> {
  const { supabase } = await agentOrLogin()
  const clientId = str(formData.get("clientId"))
  const { error } = await supabase.from("sale_offers").delete().eq("id", str(formData.get("id")))
  back(clientId, error ? "saleoffer" : undefined)
}
