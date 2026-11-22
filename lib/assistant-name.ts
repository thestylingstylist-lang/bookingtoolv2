// The assistant is Diana. Agents who named her something else keep their name;
// the old default "Marvberry" becomes Diana.
export function assistantDisplayName(stored: unknown) {
  const n = String(stored ?? "").trim()
  return !n || n.toLowerCase() === "marvberry" ? "Diana" : n
}

// The name this agent gave the assistant, ready to show.
export async function loadAssistantName(
  supabase: { from: (t: string) => any },
  agentId: string,
): Promise<string> {
  try {
    const { data } = await supabase.from("agents").select("assistant_name").eq("id", agentId).maybeSingle()
    return assistantDisplayName(data?.assistant_name)
  } catch {
    return "Diana"
  }
}
