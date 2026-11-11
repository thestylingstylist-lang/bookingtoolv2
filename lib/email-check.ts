import "server-only"
import { resolveMx, resolve4, resolve6 } from "node:dns/promises"

// Checks that an email can actually receive mail before a booking goes through:
// the domain has to exist and accept mail. Catches made-up addresses, throwaway
// inboxes and common typos. If the lookup itself fails (slow or broken DNS), we
// let the booking through rather than turn away a real person.

const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.cm": "gmail.com", "gmali.com": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com", "yhoo.com": "yahoo.com",
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com", "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com", "icoud.com": "icloud.com", "icloud.con": "icloud.com",
  "aol.co": "aol.com", "aol.con": "aol.com", "comcast.ne": "comcast.net", "verizon.ne": "verizon.net",
}

const THROWAWAY = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "fakeinbox.com", "throwawaymail.com",
  "mailnesia.com", "mintemail.com", "mohmal.com", "emailondeck.com", "burnermail.io", "tempail.com", "example.com", "test.com",
])

const FORMAT = /^[^\s@]+@([a-z0-9-]+\.)+[a-z]{2,}$/i
const NO_RECORD = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"])

async function within<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms))])
}

// null = fine. Otherwise, the message to show.
export async function checkEmail(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase()
  if (!FORMAT.test(e)) return "That email doesn't look right. Check it and try again."
  const domain = e.split("@")[1]
  if (TYPOS[domain]) return `Did you mean ${e.split("@")[0]}@${TYPOS[domain]}? Check your email and try again.`
  if (THROWAWAY.has(domain)) return "Please use an email you check, so your confirmation reaches you."
  try {
    const mx = await within(resolveMx(domain), 4000)
    if (mx.some((r) => r.exchange && r.exchange !== ".")) return null
  } catch (err) {
    const code = (err as { code?: string }).code ?? ""
    if (!NO_RECORD.has(code)) return null
  }
  // No mail servers listed. Mail can still go to the domain's own address.
  for (const look of [resolve4, resolve6]) {
    try {
      if ((await within(look(domain), 3000)).length) return null
    } catch (err) {
      if (!NO_RECORD.has((err as { code?: string }).code ?? "")) return null
    }
  }
  // Before turning anyone away, make sure lookups work at all: if a domain we
  // know is real can't be found either, the problem is on our side.
  if (!(await lookupsWork())) return null
  return "We couldn't find that email address. Check it for typos and try again."
}

let lastGood = 0
async function lookupsWork(): Promise<boolean> {
  if (Date.now() - lastGood < 10 * 60 * 1000) return true
  try {
    const mx = await within(resolveMx("gmail.com"), 3000)
    if (mx.length) lastGood = Date.now()
    return mx.length > 0
  } catch {
    return false
  }
}
