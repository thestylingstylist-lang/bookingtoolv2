import "server-only"
import { createHmac, timingSafeEqual } from "crypto"

// The private address of a realtor's calendar feed. The realtor adds it to
// their phone once; the signature means nobody can guess someone else's.
function sign(agentId: string) {
  const secret = process.env.CALENDAR_FEED_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createHmac("sha256", secret).update(`calendar:${agentId}`).digest("hex").slice(0, 32)
}

export function feedToken(agentId: string) {
  return `${agentId}.${sign(agentId)}`
}

// Returns the agent id if the token is genuine, otherwise null.
export function readFeedToken(token: string): string | null {
  const [agentId, sig] = token.replace(/\.ics$/, "").split(".")
  if (!agentId || !sig || !/^[0-9a-f-]{36}$/i.test(agentId)) return null
  const good = sign(agentId)
  if (sig.length !== good.length) return null
  return timingSafeEqual(Buffer.from(sig), Buffer.from(good)) ? agentId : null
}
