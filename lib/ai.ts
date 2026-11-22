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
    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
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

// ---------------------------------------------------------------------------
// The agent loop. Claude gets a set of tools and keeps using them, one step at a
// time, until the job is done or it needs the agent. Returns its final words,
// or null if Claude can't be reached, so the caller can say so plainly.

export type AgentTool = { name: string; description: string; input_schema: Record<string, unknown> }
export type AgentTurn = { role: "user" | "assistant"; content: string }
type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }

export async function runAgent(opts: {
  system: string
  history: AgentTurn[]
  tools: AgentTool[]
  run: (name: string, input: Record<string, unknown>) => Promise<string>
  maxSteps?: number
  // Filled with the real reason when Claude can't be reached, in plain words.
  diag?: { reason?: string }
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    if (opts.diag) opts.diag.reason = "The Anthropic API key (ANTHROPIC_API_KEY) isn't set in Vercel."
    console.error("[diana] ANTHROPIC_API_KEY is not set")
    return null
  }
  const models = [process.env.ANTHROPIC_AGENT_MODEL, process.env.ANTHROPIC_MODEL, "claude-sonnet-5-5", "claude-haiku-4-5-20251001"].filter(
    (m, i, all): m is string => !!m && all.indexOf(m) === i,
  )
  const messages: { role: "user" | "assistant"; content: string | unknown[] }[] = opts.history.map((t) => ({ role: t.role, content: t.content }))
  let model = models[0]
  for (let step = 0; step < (opts.maxSteps ?? 8); step++) {
    let data: { content?: Block[]; stop_reason?: string } | null = null
    for (const m of models.slice(models.indexOf(model))) {
      const res = await call(key, m, opts.system, messages, opts.tools, opts.diag)
      if (res === undefined) continue
      if (res === null) return null
      model = m
      data = res
      break
    }
    if (!data) {
      if (opts.diag && !opts.diag.reason) opts.diag.reason = `Anthropic didn't accept any of these model names: ${models.join(", ")}.`
      return null
    }
    const blocks = data.content ?? []
    const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim()
    const uses = blocks.filter((b) => b.type === "tool_use")
    if (data.stop_reason !== "tool_use" || !uses.length) return text || null
    messages.push({ role: "assistant", content: blocks })
    const results = []
    for (const u of uses) {
      let out: string
      try {
        out = await opts.run(u.name ?? "", u.input ?? {})
      } catch {
        out = "That didn't work. Tell the agent plainly and offer another way."
      }
      results.push({ type: "tool_result", tool_use_id: u.id, content: out.slice(0, 12000) })
    }
    messages.push({ role: "user", content: results })
  }
  return "I got partway through that. Tell me what to do next, and I’ll keep going."
}

async function call(
  key: string,
  model: string,
  system: string,
  messages: unknown[],
  tools: AgentTool[],
  diag?: { reason?: string },
): Promise<{ content?: Block[]; stop_reason?: string } | null | undefined> {
  const fail = (status: number, body: string) => {
    console.error(`[diana] Anthropic ${status} on ${model}: ${body.slice(0, 500)}`)
    if (!diag) return
    const said = body.slice(0, 240)
    diag.reason =
      status === 401
        ? "Anthropic says the API key is wrong or was revoked. Make a new key in the Anthropic Console and update ANTHROPIC_API_KEY in Vercel."
        : status === 403
          ? `Anthropic says this key isn't allowed to do that. ${said}`
          : /credit balance/i.test(body)
            ? "The Anthropic account is out of credit. Add credit in the Anthropic Console under Billing."
            : status === 429
              ? "Anthropic is limiting how many requests this key can make. Try again in a minute, or raise the limit in the Anthropic Console."
              : status >= 500
                ? `Anthropic is having trouble right now (${status}). Try again shortly.`
                : `Anthropic refused the request (${status}): ${said}`
  }
  try {
    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1500, system, tools, messages }),
      cache: "no-store",
    })
    if (res.status === 404) {
      console.error(`[diana] model not found: ${model}`)
      return undefined
    }
    if (res.status === 400) {
      const err = await res.text()
      if (/model/i.test(err) && !/credit/i.test(err)) {
        console.error(`[diana] model refused: ${model}: ${err.slice(0, 300)}`)
        return undefined
      }
      fail(400, err)
      return null
    }
    if (!res.ok) {
      fail(res.status, await res.text().catch(() => ""))
      return null
    }
    return await res.json()
  } catch (e) {
    console.error("[diana] couldn't reach Anthropic", e)
    if (diag) diag.reason = `Marvberry couldn't reach Anthropic: ${(e as Error)?.message ?? "network error"}.`
    return null
  }
}
