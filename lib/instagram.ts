// Just the handle, from whatever was pasted: "@kim", "kim",
// "https://www.instagram.com/kim/?hl=en" or "instagram.com/kim" all give "kim".
export function igHandle(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  const h = (m ? m[1] : s).replace(/^@/, "").replace(/[/?#].*$/, "")
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : ""
}
