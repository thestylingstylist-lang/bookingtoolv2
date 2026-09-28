import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { formatInTimeZone } from "date-fns-tz"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { createAdminClient } from "@/lib/supabase/admin"

// The realtor's digital business card: what shows up when their booking
// link is texted, posted, or dropped in a bio. Full photo on the left with a
// frosted strip of details, a month calendar of open days on the right.
export const alt = "Here's my availability"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 3600

const INK = "#16151a"

async function photoDataUri(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get("content-type") || ""
    if (!/image\/(png|jpe?g)/.test(type)) return null // preview renderer can't read webp/heic
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

async function fonts() {
  try {
    const dir = join(process.cwd(), "assets/og")
    const [regular, semi] = await Promise.all([
      readFile(join(dir, "Geist-Regular.ttf")),
      readFile(join(dir, "Geist-SemiBold.ttf")),
    ])
    return [
      { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: semi, weight: 600 as const, style: "normal" as const },
    ]
  } catch {
    return undefined
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug).catch(() => null)

  const name = agent?.full_name || agent?.business_name || "Your realtor"
  const business = agent?.business_name && agent.business_name !== name ? agent.business_name : ""
  const message = agent?.welcome_message || agent?.tagline || ""
  const contact = agent?.public_phone || agent?.public_email || ""
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  const photo = await photoDataUri(agent?.headshot_url || "")
  const tz = agent?.timezone || "America/New_York"

  // Which days have at least one open time.
  const openDays = new Set<string>()
  if (agent) {
    let taken = new Set<string>()
    try {
      const { data } = await createAdminClient()
        .from("bookings")
        .select("slot_start")
        .eq("agent_id", agent.id)
        .gte("slot_start", new Date().toISOString())
      taken = new Set((data ?? []).map((b: { slot_start: string }) => new Date(b.slot_start).toISOString()))
    } catch {}
    for (const s of generateSlots(toAgentConfig(agent), taken)) {
      openDays.add(formatInTimeZone(new Date(s.startISO), tz, "yyyy-MM-dd"))
    }
  }

  // Always lead with the current month, matching the live booking page. Only jump
  // ahead if the current month has no open days at all (then use the earliest that does).
  const todayKey = formatInTimeZone(new Date(), tz, "yyyy-MM-dd")
  const currentMonth = todayKey.slice(0, 7)
  const monthsWithOpen = new Set<string>()
  for (const d of openDays) monthsWithOpen.add(d.slice(0, 7))
  let monthKey = currentMonth
  if (!monthsWithOpen.has(currentMonth) && monthsWithOpen.size) {
    monthKey = [...monthsWithOpen].sort()[0]
  }
  const [y, mo] = monthKey.split("-").map(Number)
  const first = new Date(Date.UTC(y, mo - 1, 1))
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const lead = first.getUTCDay()
  const monthLabel = first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const rowH = weeks.length > 5 ? 50 : 58

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4f3f1", fontFamily: "Geist", color: INK }}>
        {/* Left: full photo with a frosted card of details */}
        <div style={{ width: 600, height: 630, position: "relative", display: "flex", overflow: "hidden" }}>
          {photo ? (
            <img src={photo} width={600} height={630} style={{ position: "absolute", top: 0, left: 0, width: 600, height: 630, objectFit: "cover" }} />
          ) : (
            <div
              style={{
                position: "absolute", top: 0, left: 0, width: 600, height: 630, display: "flex",
                alignItems: "flex-start", justifyContent: "center", paddingTop: 110,
                background: "linear-gradient(150deg, #E89BB4 0%, #F4B6A0 50%, #FBC98E 100%)",
                color: "rgba(255,255,255,0.9)", fontSize: 180, fontWeight: 600, letterSpacing: -6,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 360, display: "flex", background: "linear-gradient(to top, rgba(22,21,26,0.72), rgba(22,21,26,0))" }} />
          <div
            style={{
              position: "absolute", left: 28, right: 28, bottom: 28, display: "flex", flexDirection: "column",
              padding: "28px 32px", borderRadius: 26, color: "#ffffff",
              background: "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(255,255,255,0.12))",
              border: "1.5px solid rgba(255,255,255,0.55)",
              boxShadow: "0 20px 50px rgba(22,21,26,0.25)",
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.05 }}>{name}</div>
            {business ? <div style={{ fontSize: 22, marginTop: 6, opacity: 0.85 }}>{business}</div> : null}
            {message ? <div style={{ fontSize: 22, marginTop: 14, lineHeight: 1.3, opacity: 0.95 }}>{message.length > 90 ? message.slice(0, 88) + "…" : message}</div> : null}
            {contact ? <div style={{ fontSize: 20, marginTop: 14, opacity: 0.85 }}>{contact}</div> : null}
          </div>
        </div>

        {/* Right: month calendar with open days marked */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
          <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1.5 }}>Here&apos;s my availability</div>
          <div style={{ fontSize: 24, marginTop: 10, color: "#77757c" }}>{monthLabel}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
            <div style={{ display: "flex" }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} style={{ width: 66, display: "flex", justifyContent: "center", fontSize: 18, color: "#9a989e", paddingBottom: 6 }}>{d}</div>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} style={{ display: "flex", height: rowH, alignItems: "center" }}>
                {w.map((d, di) => {
                  if (!d) return <div key={di} style={{ width: 66, display: "flex" }} />
                  const key = `${monthKey}-${String(d).padStart(2, "0")}`
                  const open = openDays.has(key)
                  const past = key < todayKey
                  const today = key === todayKey
                  return (
                    <div key={di} style={{ width: 66, display: "flex", justifyContent: "center" }}>
                      <div
                        style={{
                          width: 44, height: 44, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, fontWeight: open ? 600 : 400,
                          background: open ? INK : "transparent",
                          color: open ? "#ffffff" : past ? "#c9c7c3" : "#9a989e",
                          border: today && !open ? `2px solid ${INK}` : "2px solid transparent",
                        }}
                      >
                        {d}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 18, color: "#9a989e", marginTop: 14 }}>Tap to pick a time · marvberry.com</div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts() }
  )
}
