// Due dates on checklist steps. Stored as a plain date ("2026-10-03") and
// judged against "today" in the realtor's time zone, so nothing shifts a day.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function toDue(value: unknown): string | null {
  const v = String(value ?? "").trim()
  return DATE_RE.test(v) ? v : null
}

function utc(d: string) {
  const [y, m, day] = d.split("-").map(Number)
  return Date.UTC(y, m - 1, day)
}

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date())
}

export function daysUntil(due: string, tz: string) {
  return Math.round((utc(due) - utc(todayIn(tz))) / 86400000)
}

function say(due: string, style: "short" | "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: style,
    month: style,
    day: "numeric",
  }).format(new Date(utc(due)))
}

// What the realtor sees. Supportive: the fact and the time, never a push.
export function agentDueLabel(due: string, tz: string) {
  const n = daysUntil(due, tz)
  if (n < 0) return `Past due · ${say(due, "short")}`
  if (n === 0) return "Due today"
  if (n === 1) return "Due tomorrow"
  return `Due ${say(due, "short")} · ${n} days left`
}

// What the client sees. Always the full day and date, nothing to guess.
export function clientDueLabel(due: string, tz: string) {
  const n = daysUntil(due, tz)
  if (n < 0) return `Past due, ${say(due, "long")}`
  if (n === 0) return `Due today, ${say(due, "long")}`
  if (n === 1) return `Due tomorrow, ${say(due, "long")}`
  return `Due ${say(due, "long")}`
}

export function isClose(due: string, tz: string) {
  return daysUntil(due, tz) <= 1
}

// The full spoken date, for messages: "Thursday, October 2".
export function longDate(due: string) {
  return say(due, "long")
}

// A client step is ready for a one-tap reminder two days out, and stays
// ready (if nobody acted) once the date has passed.
export function nudgeReady(due: string, tz: string) {
  return daysUntil(due, tz) <= 2
}

// Ready to send now: inside the window and not reminded yet — or the date has
// passed and the only reminder went out BEFORE the deadline, so a past-due
// heads-up is still owed.
export function canNudge(due: string, nudgedAt: string | null | undefined, tz: string) {
  if (!nudgeReady(due, tz)) return false
  if (!nudgedAt) return true
  return daysUntil(due, tz) < 0 && nudgedAt.slice(0, 10) <= due
}

// The reminder, in her voice. A heads-up, the date as a plain fact, and — for
// document steps — the true count still outstanding plus how to send them.
// `missingDocs` is how many documents are still not received (0 if unknown or
// not a document step). No "need", no links, no "portal".
export function nudgeDraft(o: {
  clientFirst: string
  thing: string
  due: string
  tz: string
  agentFirst: string
  missingDocs?: number
  phase?: string | null
}) {
  const hi = o.clientFirst ? `Hey ${o.clientFirst}` : "Hey"
  const when = longDate(o.due)
  const past = daysUntil(o.due, o.tz) < 0

  // Past due: a warm heads-up that names what's missing and what it holds up.
  if (past) {
    const n = o.missingDocs ?? 0
    const what = n > 1 ? `${numword(n)} of your documents` : n === 1 ? "one of your documents" : o.thing
    const it = n > 1 ? "them" : n === 1 ? "it" : itPronoun(o.thing)
    const holds = o.phase === "offer" ? `, so the offer can go in` : ""
    return `${hi}, just a quick reminder, I haven't received ${what} yet. Just a heads up, the deal keeps moving, but it might get pushed back a little. The date stays pending until I get ${it}${holds}.\n\n${o.agentFirst}`
  }
  const dateLine = past
    ? `The date to have ${itPronoun(o.thing)} in was ${when}.`
    : `${when} is the date to have ${itPronoun(o.thing)} in.`

  // Document steps get the real count and the upload instructions.
  const n = o.missingDocs ?? 0
  if (n > 0) {
    const noun = n === 1 ? "one more document" : `${numword(n)} more documents`
    const them = n === 1 ? "it" : "them"
    const which = n === 1 ? "the document that's missing" : "the documents that are missing"
    const oneAtATime = n === 1 ? "" : ", one at a time"
    return `${hi}, just a heads up, we're still missing ${noun}. ${when} is the date to have ${them} in. It's super easy — on your page just click ${which} and upload ${them}${oneAtATime}. Once you upload ${them}, I get ${them} right away.\n\n${o.agentFirst}`
  }

  // Everything else: the plain heads-up.
  return `${hi}, just a heads up, we're still missing ${o.thing}. ${dateLine} You can send ${itPronoun(o.thing)} from your page.\n\n${o.agentFirst}`
}

function numword(n: number) {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n)
}

function itPronoun(thing: string) {
  const head = thing.trim().toLowerCase().split(/\s+(?:for|of|to|you're|that|from)\s+/)[0]
  const last = head.split(/\s+/).pop() ?? ""
  return last.endsWith("s") ? "them" : "it"
}

// A step title turned into what the CLIENT would call the missing thing.
export function missingThing(title: string) {
  const t = title.trim().toLowerCase()
  const map: Record<string, string> = {
    "collect the client's documents": "your documents for the offer",
    "buyer sent their criteria": "your wish list",
    "get their availability": "the times you're free to see homes",
    "agreement signed": "your signed agreement",
  }
  if (map[t]) return map[t]
  // Custom steps are usually "Send pay stubs": drop the verb, keep the thing.
  const bare = title.trim().replace(/^(send|upload|sign|get|collect|provide|share|submit|bring|email)\s+/i, "")
  return bare.replace(/^[A-Z]/, (c) => c.toLowerCase())
}
