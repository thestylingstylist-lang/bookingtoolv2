import { createAdminClient } from "@/lib/supabase/admin"
import { getAgentBySlug } from "@/lib/agent"
import { claimTokenOf } from "@/lib/claim"
import { siteUrl } from "@/lib/stripe"

// "Save contact": a contact file the phone opens straight into its contacts app,
// with the agent's photo, phone, email, brokerage and a link back to the card.

const v = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1")

async function photo(url: string): Promise<string> {
  if (!url) return ""
  try {
    const res = await fetch(url, { cache: "no-store" })
    const type = res.headers.get("content-type") || ""
    if (!res.ok || !/jpe?g|png/i.test(type)) return ""
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 900_000) return ""
    const b64 = buf.toString("base64").replace(/(.{74})/g, "$1\r\n ")
    return `PHOTO;ENCODING=b;TYPE=${/png/i.test(type) ? "PNG" : "JPEG"}:${b64}`
  } catch {
    return ""
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = await getAgentBySlug(slug)
  if (!agent) return new Response("Not found", { status: 404 })
  const token = await claimTokenOf(agent.id)
  if (token && new URL(req.url).searchParams.get("claim") !== token) return new Response("Not found", { status: 404 })
  const name = (agent.full_name || agent.business_name || "Agent").trim()
  const parts = name.split(/\s+/)
  const last = parts.length > 1 ? parts.pop()! : ""
  let address = ""
  let office = ""
  let site = ""
  let insta = ""
  try {
    const { data } = await createAdminClient().from("agents").select("office_address").eq("id", agent.id).maybeSingle()
    address = ((data?.office_address as string) || "").trim()
    const { data: l } = await createAdminClient().from("agents").select("office_phone, website_url, instagram").eq("id", agent.id).maybeSingle()
    office = ((l?.office_phone as string) || "").trim()
    site = ((l?.website_url as string) || "").trim()
    insta = ((l?.instagram as string) || "").trim().replace(/^@/, "")
  } catch {}
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${v(last)};${v(parts.join(" "))};;;`,
    `FN:${v(name)}`,
    agent.business_name && agent.business_name !== name ? `ORG:${v(agent.business_name)}` : "",
    "TITLE:Real estate agent",
    agent.public_phone ? `TEL;TYPE=CELL:${v(agent.public_phone)}` : "",
    office ? `TEL;TYPE=WORK:${v(office)}` : "",
    agent.public_email ? `EMAIL;TYPE=INTERNET:${v(agent.public_email)}` : "",
    site ? `URL;TYPE=WORK:${v(site)}` : "",
    insta ? `X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/${v(insta)}` : "",
    address ? `ADR;TYPE=WORK:;;${v(address.replace(/\s*\n\s*/g, ", "))};;;;` : "",
    `URL:${siteUrl()}/book/${agent.slug}`,
    await photo(agent.headshot_url),
    "END:VCARD",
  ].filter(Boolean)
  if (!token) {
    try {
      await createAdminClient().from("card_events").insert({ agent_id: agent.id, kind: "save" })
    } catch {}
  }
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${name.replace(/[^a-z0-9 ]/gi, "").trim() || "contact"}.vcf"`,
      "cache-control": "no-store",
    },
  })
}
