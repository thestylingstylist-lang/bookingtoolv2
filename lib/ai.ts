import "server-only"

// One small door to Claude. If the key isn't set or anything goes wrong, it
// returns null and the caller keeps the plain draft. The realtor never sees an error.
export async function askClaude(system: string, prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const models = [process.env.ANTHROPIC_MODEL, "claude-sonnet-5-5", "claude-haiku-4-5-20251001"].filter(
    (m, i, all): m is string => !!m && all.indexOf(m) === i,
  )
  for (const model of models) {
    const text = await once(key, model, system, prompt)
    if (text !== undefined) return text
  }
  return null
}

// undefined = this model isn't available, try the next one. null = give up quietly.
async function once(key: string, model: string, system: string, prompt: string): Promise<string | null | undefined> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      cache: "no-store",
    })
    if (res.status === 404 || res.status === 400) return undefined
    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
    return text || null
  } catch {
    return null
  }
}
