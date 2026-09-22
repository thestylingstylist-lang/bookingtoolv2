// Shared placeholder logic. Both the template setup screen and the
// per-client fill screen import this so they always agree on what a
// blank is and where its value comes from.
//
// Syntax the agent types in their wording:  [[Client name]]
//
// Two kinds of blank:
//   auto  — pulled from records, nothing to type   (shown green)
//   deal  — the agent fills once per client         (shown amber)

export type Placeholder = {
  raw: string // exactly as written, e.g. "[[Client name]]"
  key: string // normalized, e.g. "client name"
  label: string // what to show a human, e.g. "Client name"
  kind: "auto" | "deal"
}

// Blanks we can fill ourselves from the client + agent records.
// key (lowercased) -> human label
export const AUTO_FILL: Record<string, string> = {
  "client name": "Client name",
  "client first name": "Client first name",
  "client last name": "Client last name",
  "client address": "Client address",
  "client email": "Client email",
  "client phone": "Client phone",
  "agent name": "Agent name",
  brokerage: "Brokerage",
  "business name": "Brokerage",
  date: "Today's date",
  "today's date": "Today's date",
}

const PLACEHOLDER_RE = /\[\[([^\]]+)\]\]/g

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Find every [[blank]] in the body, in order, de-duplicated by key.
export function parsePlaceholders(body: string): Placeholder[] {
  const seen = new Set<string>()
  const out: Placeholder[] = []
  for (const m of body.matchAll(PLACEHOLDER_RE)) {
    const inner = m[1].trim()
    const key = inner.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const auto = AUTO_FILL[key]
    out.push({
      raw: m[0],
      key,
      label: auto ?? titleCase(inner),
      kind: auto ? "auto" : "deal",
    })
  }
  return out
}

// Common blanks offered as one-tap chips in the editor.
export const SUGGESTED_CHIPS: string[] = [
  "Client name",
  "Client address",
  "Client email",
  "Agent name",
  "Brokerage",
  "Date",
  "Commission %",
  "End date",
]
