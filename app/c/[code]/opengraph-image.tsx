import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { agentByShortCode } from "@/lib/short-link"
import { getAgentBySlug } from "@/lib/agent"

// What shows in the text message: her card, the way it looks when opened.
// Photo on the left, her name in the card's serif on the right.
export const alt = "Marvberry Card"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const revalidate = 3600

const INK = "#2A2522"
const BG = "#FAFAFA"

async function photoDataUri(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get("content-type") || ""
    if (!/image\/(png|jpe?g)/.test(type)) return null
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
  } catch {
    return null
  }
}

async function fonts() {
  try {
    const dir = join(process.cwd(), "assets/og")
    const [geist, serif, italic] = await Promise.all([
      readFile(join(dir, "Geist-Regular.ttf")),
      readFile(join(dir, "Cormorant-500.woff")),
      readFile(join(dir, "Cormorant-400-italic.woff")),
    ])
    return [
      { name: "Geist", data: geist, weight: 400 as const, style: "normal" as const },
      { name: "Cormorant", data: serif, weight: 500 as const, style: "normal" as const },
      { name: "Cormorant", data: italic, weight: 400 as const, style: "italic" as const },
    ]
  } catch {
    return undefined
  }
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const a = await agentByShortCode(code)
  const agent = a ? await getAgentBySlug(a.slug).catch(() => null) : null
  const name = agent?.full_name || agent?.business_name || "Your card"
  return cardImage({
    name,
    brokerage: agent?.business_name && agent.business_name !== name ? agent.business_name : "",
    tagline: agent?.tagline || "",
    photo: await photoDataUri(agent?.headshot_url || ""),
  })
}

export async function cardImage({ name, brokerage, tagline, photo }: { name: string; brokerage: string; tagline: string; photo: string | null }) {
  const lines = tagline.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 2)
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  const big = name.length > 18 ? 72 : 88

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BG, color: INK, fontFamily: "Geist" }}>
        <div style={{ width: 500, height: 630, display: "flex", position: "relative", overflow: "hidden", background: "#EEEAE5" }}>
          {photo ? (
            <img src={photo} width={500} height={630} style={{ width: 500, height: 630, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 500, height: 630, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cormorant", fontSize: 160, color: "#BDB5AC" }}>
              {initials}
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px" }}>
          <div style={{ fontSize: 18, letterSpacing: 4, textTransform: "uppercase", color: "#8A817A" }}>
            {["Real estate agent", brokerage].filter(Boolean).join("  ·  ")}
          </div>
          <div style={{ fontFamily: "Cormorant", fontWeight: 500, fontSize: big, lineHeight: 1, letterSpacing: -1, marginTop: 22 }}>{name}</div>
          {lines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "Cormorant", fontStyle: "italic", fontSize: 36, lineHeight: 1.2, marginTop: 26, color: "#5B524C" }}>
              {lines.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
          <div style={{ width: 64, height: 1, background: INK, marginTop: 40 }} />
          <div style={{ fontSize: 18, color: "#8A817A", marginTop: 20 }}>Tap to open my card</div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts() },
  )
}
