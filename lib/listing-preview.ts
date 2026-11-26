import "server-only"

// Reads a listing page for what the client's home card shows: the main photo, the
// price, beds and baths. Uses the page's own sharing tags and structured data.
// Some listing sites refuse automated visits; then nothing comes back and the agent
// can fill these in on the home.

export type ListingPreview = { photo: string; price: number | null; beds: number | null; baths: number | null }

const EMPTY: ListingPreview = { photo: "", price: null, beds: null, baths: null }

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/gi, "/")

function meta(html: string, key: string): string {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i"))
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, "i"))
  return decode((a?.[1] ?? b?.[1] ?? "").trim())
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Walk JSON-LD blocks for a price, bedrooms and bathrooms, wherever the site put them.
function fromJsonLd(html: string): Partial<ListingPreview> {
  const out: Partial<ListingPreview> = {}
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown
    try {
      data = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const stack: unknown[] = [data]
    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== "object") continue
      if (Array.isArray(node)) {
        stack.push(...node)
        continue
      }
      const o = node as Record<string, unknown>
      out.price ??= num((o.offers as Record<string, unknown> | undefined)?.price) ?? (o["@type"] === "Offer" ? num(o.price) : null) ?? undefined
      out.beds ??= num(o.numberOfBedrooms) ?? num(o.numberOfRooms) ?? undefined
      out.baths ??= num(o.numberOfBathroomsTotal) ?? num(o.numberOfFullBathrooms) ?? undefined
      if (!out.photo) {
        const img = o.image
        const first = Array.isArray(img) ? img[0] : img
        const url = typeof first === "string" ? first : (first as Record<string, unknown> | undefined)?.url
        if (typeof url === "string" && /^https?:\/\//.test(url)) out.photo = url
      }
      for (const v of Object.values(o)) if (v && typeof v === "object") stack.push(v)
    }
  }
  return out
}

// "4 beds, 3 baths, $1,285,000" in a title or description.
function fromText(text: string): Partial<ListingPreview> {
  const price = text.match(/\$\s?([\d,]{5,}(?:\.\d+)?)(?!\s*\/\s*mo)/i)
  const beds = text.match(/(\d+(?:\.\d)?)\s*(?:bd|beds?|bedrooms?)\b/i)
  const baths = text.match(/(\d+(?:\.\d)?)\s*(?:ba|baths?|bathrooms?)\b/i)
  return { price: price ? num(price[1]) : null, beds: beds ? num(beds[1]) : null, baths: baths ? num(baths[1]) : null }
}

export async function readListing(url: string): Promise<ListingPreview> {
  if (!/^https?:\/\//i.test(url)) return EMPTY
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
    if (!res.ok) return EMPTY
    const html = (await res.text()).slice(0, 2_000_000)
    const ld = fromJsonLd(html)
    const text = fromText(`${meta(html, "og:title")} ${meta(html, "og:description")} ${meta(html, "description")} ${(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "")}`)
    let photo = meta(html, "og:image") || meta(html, "twitter:image") || ld.photo || ""
    if (photo.startsWith("//")) photo = `https:${photo}`
    if (photo && !/^https?:\/\//.test(photo)) photo = new URL(photo, url).toString()
    return { photo, price: ld.price ?? text.price ?? null, beds: ld.beds ?? text.beds ?? null, baths: ld.baths ?? text.baths ?? null }
  } catch {
    return EMPTY
  }
}
