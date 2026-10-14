import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { formatInTimeZone } from "date-fns-tz"

// What changed since she last looked: new bookings, client messages, signed
// documents, client uploads. Empty when nothing did — then nothing is said.
export type NewsItem = { key: string; kind: string; line: string; sub: string; href: string; cta: string; at: string }

type Named = { first_name: string | null; last_name: string | null } | null
const full = (c: Named) => `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim() || "A client"
const first = (c: Named) => c?.first_name?.trim() || "a client"

export async function whatsNew(db: SupabaseClient, sinceISO: string, tz: string) {
  const [b, m, d, u] = await Promise.all([
    db.from("bookings").select("id, first_name, last_name, meeting_type, slot_start, created_at").gt("created_at", sinceISO).order("created_at", { ascending: false }).limit(10),
    db.from("messages").select("client_id, created_at, clients(first_name, last_name)").eq("sender", "client").gt("created_at", sinceISO).order("created_at", { ascending: false }).limit(50),
    db.from("documents").select("id, title, client_id, signed_at, clients(first_name, last_name)").gt("signed_at", sinceISO).order("signed_at", { ascending: false }).limit(10),
    db.from("collected_docs").select("id, title, client_id, received_at, clients(first_name, last_name)").not("file_path", "is", null).gt("received_at", sinceISO).order("received_at", { ascending: false }).limit(10),
  ])

  const items: NewsItem[] = []
  for (const r of b.data ?? []) {
    items.push({
      key: `b${r.id}`,
      kind: "New booking",
      line: `${`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Someone"} booked a ${r.meeting_type === "virtual" ? "video call" : "call"}.`,
      sub: formatInTimeZone(new Date(r.slot_start as string), tz, "EEEE, MMMM d 'at' h:mm a"),
      href: "/bookings",
      cta: "See booking",
      at: r.created_at as string,
    })
  }
  const byClient = new Map<string, { n: number; at: string; c: Named }>()
  for (const r of m.data ?? []) {
    const k = r.client_id as string
    const cur = byClient.get(k)
    if (cur) cur.n++
    else byClient.set(k, { n: 1, at: r.created_at as string, c: r.clients as unknown as Named })
  }
  for (const [cid, v] of byClient) {
    items.push({
      key: `m${cid}`,
      kind: "Message",
      line: `${full(v.c)} sent you ${v.n === 1 ? "a message" : `${v.n} messages`}.`,
      sub: "Waiting on your reply",
      href: `/clients/${cid}`,
      cta: "Reply",
      at: v.at,
    })
  }
  for (const r of d.data ?? []) {
    items.push({
      key: `d${r.id}`,
      kind: "Signed",
      line: `${full(r.clients as unknown as Named)} signed ${r.title || "their document"}.`,
      sub: "It's filed on their page",
      href: `/clients/${r.client_id}`,
      cta: "Open client",
      at: r.signed_at as string,
    })
  }
  for (const r of u.data ?? []) {
    items.push({
      key: `u${r.id}`,
      kind: "Document in",
      line: `${full(r.clients as unknown as Named)} sent ${r.title || "a document"}.`,
      sub: "Ready for you to look over",
      href: `/clients/${r.client_id}`,
      cta: "Open client",
      at: r.received_at as string,
    })
  }
  items.sort((x, y) => (x.at < y.at ? 1 : -1))

  // One plain sentence, built only from what actually happened.
  const parts: string[] = []
  const nb = (b.data ?? []).length
  if (nb) parts.push(nb === 1 ? "you got a new booking" : `you got ${nb} new bookings`)
  const msgFrom = [...byClient.values()].map((v) => first(v.c))
  if (msgFrom.length === 1) parts.push(`${msgFrom[0]} sent you a message`)
  else if (msgFrom.length > 1) parts.push(`${msgFrom.length} clients sent you messages`)
  const ns = (d.data ?? []).length
  if (ns === 1) parts.push(`${first(d.data![0].clients as unknown as Named)} signed`)
  else if (ns > 1) parts.push(`${ns} documents were signed`)
  const nu = (u.data ?? []).length
  if (nu === 1) parts.push(`${first(u.data![0].clients as unknown as Named)} sent a document`)
  else if (nu > 1) parts.push(`${nu} documents came in`)
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] ?? ""
  const headline = joined ? `While you were away, ${joined}.` : ""
  // (names come first in each part, so only the fallback is lowercase)

  return { headline, items: items.slice(0, 5), more: Math.max(0, items.length - 5) }
}
