import { ImageResponse } from "next/og"
import { getAgentBySlug } from "@/lib/agent"
import { toAgentConfig } from "@/lib/config"
import { generateSlots } from "@/lib/slots"
import { createAdminClient } from "@/lib/supabase/admin"

// The realtor's digital business card: what shows up when their booking
// link is texted, posted, or dropped in a bio.
export const alt = "Book a time with your realtor"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 3600

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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug).catch(() => null)

  const name = agent?.full_name || agent?.business_name || "Your realtor"
  const business = agent?.business_name && agent.business_name !== name ? agent.business_name : ""
  const tagline = agent?.tagline || "Pick a time that works for you."
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  const photo = await photoDataUri(agent?.headshot_url || "")

  // Real open times, grouped by day: the first 3 days, up to 3 times each.
  const days: { label: string; times: string[] }[] = []
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
      let day = days.find((d) => d.label === s.dayLabel)
      if (!day) {
        if (days.length === 3) break
        day = { label: s.dayLabel, times: [] }
        days.push(day)
      }
      if (day.times.length < 3) day.times.push(s.timeLabel)
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f6f0ea",
          fontFamily: "Georgia, serif",
          color: "#1c1012",
        }}
      >
        {/* Left: the business card */}
        <div
          style={{
            width: 560,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 64px",
            background: "#5c0a17",
            color: "#fff8f4",
          }}
        >
          {photo ? (
            <img src={photo} width={180} height={180} style={{ borderRadius: 999, objectFit: "cover", border: "6px solid #e9b8ae" }} />
          ) : (
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: 999,
                background: "#e9b8ae",
                color: "#5c0a17",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ fontSize: 56, marginTop: 36, lineHeight: 1.05 }}>{name}</div>
          {business ? <div style={{ fontSize: 28, marginTop: 10, color: "#e9b8ae" }}>{business}</div> : null}
          <div style={{ fontSize: 26, marginTop: 22, lineHeight: 1.3, color: "#f0dcd6" }}>{tagline}</div>
        </div>

        {/* Right: their real open times */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
          <div style={{ fontSize: 40 }}>Book a time</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
            {(days.length ? days : [{ label: "Open times", times: ["Tap to see"] }]).map((d) => (
              <div key={d.label} style={{ display: "flex", flexDirection: "column", marginBottom: 22 }}>
                <div style={{ fontSize: 22, color: "#94807b" }}>{d.label}</div>
                <div style={{ display: "flex", marginTop: 8 }}>
                  {d.times.map((t, i) => (
                    <div
                      key={t}
                      style={{
                        fontSize: 22,
                        padding: "10px 18px",
                        marginRight: 10,
                        borderRadius: 12,
                        background: i === 0 ? "#5c0a17" : "#ffffff",
                        color: i === 0 ? "#fff8f4" : "#1c1012",
                        border: "1px solid #ede3da",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 20, color: "#94807b", marginTop: 8 }}>marvberry.com</div>
        </div>
      </div>
    ),
    size
  )
}
