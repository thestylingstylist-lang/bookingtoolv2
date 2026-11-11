import "server-only"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import type { PdfField } from "./pdf-fields"

// Writes each value into its spot on the agent's own PDF. Where the form has
// printed wording in the spot (like "(client's name)"), it's whited out first.
export async function fillPdf(bytes: ArrayBuffer | Uint8Array, fields: PdfField[], values: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  for (const f of fields) {
    const page = pages[f.page]
    if (!page) continue
    const { width, height } = page.getSize()
    const x = f.x * width
    const w = f.w * width
    const h = f.h * height
    const yTop = height - f.y * height
    if (f.cover) page.drawRectangle({ x: x - 1, y: yTop - h - 1, width: w + 2, height: h + 2, color: rgb(1, 1, 1) })
    const text = (values[f.key] ?? "").replace(/[^\x20-\x7E -ÿ]/g, "").trim()
    if (!text) continue
    let size = f.size || 11
    // Shrink long values to fit the box, but never below a readable size, and
    // never cut a name or an amount short.
    while (size > 7 && font.widthOfTextAtSize(text, size) > w) size -= 0.5
    const baseline = yTop - h + Math.max(1, (h - size) / 2) + size * 0.22
    page.drawText(text, { x, y: baseline, size, font, color: rgb(0.08, 0.08, 0.1) })
  }
  return doc.save()
}
