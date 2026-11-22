import { formatInTimeZone } from "date-fns-tz"

// A plain hello to Diana gets a plain hello back: warm, short, no work.
// It never reaches the AI, so a greeting can't turn into a briefing.

const HELLO = String.raw`(?:hi|hello|hey|hiya|howdy|yo|good (?:morning|afternoon|evening)|morning|evening|afternoon)`
const HOW = String.raw`(?:how are you(?: doing| today)?|how(?:'|’)?s it going|how are things|you good|how(?:'|’)?s your day(?: going)?)`

export function isGreeting(text: string, assistantName: string): { greeting: boolean; asksHow: boolean } {
  const name = assistantName.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const t = text.trim().toLowerCase().replace(/\s+/g, " ")
  const tail = String.raw`(?:\s*,?\s*(?:${name}|there|again))?`
  const re = new RegExp(String.raw`^(?:${HELLO}${tail}[\s,.!?]*(?:${HOW}[\s,.!?]*(?:${name})?[\s.!?]*)?|${HOW}${tail}[\s.!?]*)$`, "i")
  if (!re.test(t)) return { greeting: false, asksHow: false }
  return { greeting: true, asksHow: new RegExp(HOW, "i").test(t) }
}

// `count` is how many times the agent has already said hello in this chat,
// so a repeated hello gets a fresh, equally warm answer. Never more.
export function greetingReply(opts: { firstName: string; tz: string; count: number; asksHow: boolean; now?: Date }): string {
  const now = opts.now ?? new Date()
  const day = formatInTimeZone(now, opts.tz, "EEEE")
  const hour = Number(formatInTimeZone(now, opts.tz, "H"))
  const n = opts.firstName ? `, ${opts.firstName}` : ""
  const name = opts.firstName ? ` ${opts.firstName}` : ""
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const well = opts.asksHow ? "I’m doing well, thanks for asking. " : ""
  const lines = [
    `${hour < 12 ? `Good morning${n}` : `Hey${name}`}! ${well}How’s your ${day} going?`,
    `Hi again${n}! ${well}How are you doing today?`,
    `Hello${n}! ${well}Always nice to hear from you. How’s your ${part} been?`,
    `Hey${name}! ${well}How’s everything going on your end?`,
  ]
  return lines[opts.count % lines.length]
}
