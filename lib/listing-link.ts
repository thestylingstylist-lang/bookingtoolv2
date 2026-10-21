// Reads an address out of a listing link the realtor pastes in.
// Zillow:  /homedetails/24-Willow-St-Montclair-NJ-07042/12345_zpid/
// Realtor: /realestateandhomes-detail/24-Willow-St_Montclair_NJ_07042_M12345-67890
// Anything else: no address, the realtor types it.

const SUFFIX = new Set(
  "st street ave avenue rd road dr drive ln lane ct court blvd pl place way ter terrace pkwy cir circle hwy sq trl loop row aly".split(" "),
)
const cap = (w: string) =>
  /^\d+(st|nd|rd|th)$/i.test(w) ? w.toLowerCase() : /^\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

export function addressFromLink(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, "")
  const parts = url.pathname.split("/").filter(Boolean)

  let slug = ""
  if (host.endsWith("zillow.com")) slug = parts[parts.indexOf("homedetails") + 1] || ""
  else if (host.endsWith("realtor.com")) slug = (parts[parts.indexOf("realestateandhomes-detail") + 1] || "").replace(/_M\d.*$/, "").replace(/_/g, "-")
  if (!slug || !/^\d/.test(slug)) return null

  const words = decodeURIComponent(slug).split("-").filter(Boolean)
  const zip = /^\d{5}$/.test(words[words.length - 1] ?? "") ? words.pop()! : ""
  const state = /^[a-z]{2}$/i.test(words[words.length - 1] ?? "") ? words.pop()!.toUpperCase() : ""
  // Street ends at the first street word (St, Ave…), plus an apartment number if one follows.
  let cut = words.findIndex((w, i) => i > 0 && SUFFIX.has(w.toLowerCase()))
  if (cut === -1) return words.map(cap).join(" ") || null
  cut += 1
  if (/^(apt|unit|#)$/i.test(words[cut] ?? "")) cut += 2
  // Queens-style house numbers: "150-12 84th Ave".
  const sw = words.slice(0, cut).map(cap)
  if (sw.length > 2 && /^\d+$/.test(sw[0]) && /^\d+$/.test(sw[1])) sw.splice(0, 2, `${sw[0]}-${sw[1]}`)
  const street = sw.join(" ")
  const city = words.slice(cut).map(cap).join(" ")
  return [street, city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")
}
