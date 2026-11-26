// Document text rules shared by Diana, the client page and the send actions.
//
// Templates come in many hands: some write blanks as [[Client name]], others as
// [Client Name] or {{Client Name}}. All three are the same blank. A checkbox like
// [ ] or [x] is not a blank, and neither is a link written [text](url).
//
// Documents are plain text. Markdown symbols (**bold**, # headings, `code`) never
// reach a client.

const CURLY = /\{\{\s*([^{}\n]{1,60}?)\s*\}\}/g
const SINGLE = /(?<![[\w])\[(?!\[)([^[\]\n]{2,60})\](?![\](])/g
const DOUBLE = /\[\[([^\]\n]+)\]\]/g

const isLabel = (inner: string) => /[a-z]/i.test(inner) && !/^\s*x\s*$/i.test(inner)

// Signature, date and representative lines are drawn by the signing page with the real
// signatures, so a template's own "Buyer signature: ________" lines are taken out.
const SIGN_LINE = /^(?:.*\b(?:signature|signed|sign here|initials?|authorized representative|representative|broker(?:'s)? (?:signature|approval)|print(?:ed)? name|date signed)\b.*|date)$/i

// "Commission: ________" is a blank like any other. A lone row of underscores is not.
function underscoreLines(body: string): string {
  return body
    .split("\n")
    .flatMap((line) => {
      const m = line.match(/^[ \t]*([^:\n_]{1,60}?)[ \t]*:[ \t]*_{3,}[ \t.]*$/)
      if (m) return SIGN_LINE.test(m[1].trim()) ? [] : [`${m[1].trim()}: [[${m[1].trim()}]]`]
      if (/^[ \t]*_{3,}[ \t]*$/.test(line)) return []
      if (/^[ \t]*_{3,}[ \t]*\(?([^)_]{1,60})\)?[ \t]*$/.test(line) && SIGN_LINE.test(line.replace(/[_()]/g, "").trim())) return []
      return [line]
    })
    .join("\n")
}

// Rewrite every blank as [[Label]] so one filler handles them all.
export function normalizeBlanks(body: string): string {
  return underscoreLines(body.replace(/\r\n/g, "\n"))
    .replace(CURLY, (m, inner: string) => (isLabel(inner) ? `[[${inner.trim()}]]` : m))
    .replace(SINGLE, (m, inner: string) => (isLabel(inner) ? `[[${inner.trim()}]]` : m))
}

// The blanks still in a document, in order, once each. Empty means it can be sent.
export function leftoverBlanks(body: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of normalizeBlanks(body).matchAll(DOUBLE)) {
    const label = m[1].trim()
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

// Plain text only: strip markdown emphasis, headings and code marks; turn "* item" into a bullet.
export function cleanDoc(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    // Horizontal rules (---, ***, ===) are markdown, not wording.
    .replace(/^[ \t]*([-*=~])(?:[ \t]*\1){2,}[ \t]*$/gm, "")
    .replace(/^[ \t]*[*+][ \t]+/gm, "• ")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/__([^_\n]+?)__/g, "$1")
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1$2")
    .replace(/`([^`\n]*)`/g, "$1")
    .replace(/\*\*|__(?!_)/g, "")
    .replace(/(\w)\.\.(?!\.)/g, "$1.")
    // "Brokerage Name:Marvberry Home" -> "Brokerage Name: Marvberry Home" (times and links untouched).
    .replace(/(^|[\s(])([A-Za-z][A-Za-z'’ ]{0,40}[A-Za-z]):(?=[A-Za-z\[])/gm, "$1$2: ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// "Commission" and "Client address" in a friendly list: A, B and C.
export function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? ""
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`
}
