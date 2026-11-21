// The assistant is Diana. Agents who named her something else keep their name;
// the old default "Marvberry" becomes Diana.
export function assistantDisplayName(stored: unknown) {
  const n = String(stored ?? "").trim()
  return !n || n.toLowerCase() === "marvberry" ? "Diana" : n
}
