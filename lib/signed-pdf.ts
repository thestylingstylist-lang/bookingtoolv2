import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import { cleanDoc } from "@/lib/doc-text"

// The final signed agreement as a PDF: the wording, then every signature in script
// with its date and time, then the signature record. Letter size, the suite's serif.

export type Signer = { role: string; name: string; at: string; ip?: string | null }

const INK = rgb(0.122, 0.118, 0.11)
const SOFT = rgb(0.4, 0.38, 0.35)
const GOLD = rgb(0.76, 0.64, 0.42)
const W = 612
const H = 792
const M = 66

const fontFile = (f: string) => readFile(path.join(process.cwd(), "assets/fonts", f))

function when(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz || "America/New_York", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso))
}

// Keep only characters the font can draw.
function safe(font: PDFFont, s: string) {
  let out = ""
  for (const ch of s) {
    try {
      font.encodeText(ch)
      out += ch
    } catch {
      out += ch === "\t" ? "    " : ""
    }
  }
  return out
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const lines: string[] = []
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      lines.push("")
      continue
    }
    let line = ""
    for (const word of para.split(/(\s+)/)) {
      const next = line + word
      if (font.widthOfTextAtSize(next, size) <= width || !line.trim()) line = next
      else {
        lines.push(line.trimEnd())
        line = word.trimStart()
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

export async function buildSignedPdf(opts: {
  title: string
  body: string
  preparedBy: string
  brokerage?: string
  tz: string
  signers: Signer[]
  docId: string
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const [reg, semi, ital, sig] = await Promise.all([
    fontFile("CormorantGaramond-Regular.ttf"),
    fontFile("CormorantGaramond-SemiBold.ttf"),
    fontFile("CormorantGaramond-Italic.ttf"),
    fontFile("MrsSaintDelafield-Regular.ttf"),
  ])
  const fReg = await pdf.embedFont(reg, { subset: true })
  const fSemi = await pdf.embedFont(semi, { subset: true })
  const fItal = await pdf.embedFont(ital, { subset: true })
  const fSig = await pdf.embedFont(sig, { subset: true })
  pdf.setTitle(opts.title)
  pdf.setAuthor(opts.preparedBy)
  pdf.setCreator("Marvberry")

  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M
  const room = (need: number) => {
    if (y - need < M + 20) {
      page = pdf.addPage([W, H])
      y = H - M
    }
  }
  const text = (s: string, x: number, size: number, font: PDFFont, color = INK) => page.drawText(safe(font, s), { x, y, size, font, color })

  // Heading
  text(`Prepared by ${opts.preparedBy}${opts.brokerage ? ` · ${opts.brokerage}` : ""}`, M, 10.5, fReg, SOFT)
  y -= 34
  for (const l of wrap(fSemi, 24, safe(fSemi, opts.title), W - 2 * M)) {
    text(l, M, 24, fSemi)
    y -= 28
  }
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: GOLD })
  y -= 26

  // Wording
  const size = 12
  const lead = 17
  for (const l of wrap(fReg, size, safe(fReg, cleanDoc(opts.body)), W - 2 * M)) {
    room(lead)
    if (l) text(l, M, size, fReg)
    y -= l ? lead : lead * 0.6
  }

  // Signatures: the name in script on the line, the date and time beside it.
  y -= 18
  room(40)
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: rgb(0.85, 0.83, 0.8) })
  y -= 30
  const dateX = W - M - 170
  for (const s of opts.signers) {
    room(96)
    text(s.role, M, 10, fReg, SOFT)
    text("Date and time", dateX, 10, fReg, SOFT)
    y -= 40
    text(s.name, M + 4, 30, fSig)
    for (const [i, l] of wrap(fReg, 10.5, when(s.at, opts.tz), 170).entries()) page.drawText(safe(fReg, l), { x: dateX, y: y + 2 - i * 13, size: 10.5, font: fReg, color: INK })
    y -= 8
    page.drawLine({ start: { x: M, y }, end: { x: dateX - 18, y }, thickness: 0.7, color: INK })
    page.drawLine({ start: { x: dateX, y }, end: { x: W - M, y }, thickness: 0.7, color: INK })
    y -= 14
    text(s.name, M, 10, fItal, SOFT)
    y -= 30
  }

  // Signature record
  room(40 + opts.signers.length * 15)
  text("Signature record", M, 11, fSemi)
  y -= 16
  for (const s of opts.signers) {
    const line = `${s.role.replace(/’s signature$|'s signature$/, "")}: ${s.name}, signed electronically ${when(s.at, opts.tz)}${s.ip ? ` from ${s.ip}` : ""}`
    for (const l of wrap(fReg, 9.5, line, W - 2 * M)) {
      room(13)
      text(l, M, 9.5, fReg, SOFT)
      y -= 13
    }
  }
  y -= 4
  text(`Document ${opts.docId}`, M, 9, fReg, SOFT)

  // Page numbers
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    const label = `${i + 1} of ${pages.length}`
    p.drawText(label, { x: W - M - fReg.widthOfTextAtSize(label, 9), y: 36, size: 9, font: fReg, color: SOFT })
  })
  return pdf.save()
}
