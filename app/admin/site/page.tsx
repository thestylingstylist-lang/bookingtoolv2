import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

// Home page visits (filled by /api/track): how long people stay, where they
// spend time, and where they leave.
const SECTIONS = [
  { key: "hero", label: "Headline" },
  { key: "statement", label: "“One deal used to mean five apps”" },
  { key: "features", label: "Features" },
  { key: "cards", label: "Booking link / business card" },
  { key: "bento", label: "“Set your hours”" },
  { key: "pricing", label: "Pricing" },
  { key: "faq", label: "FAQ" },
  { key: "final", label: "Final call" },
]
const RANGES = [7, 30, 90]

type Visit = {
  referrer: string | null
  utm_source: string | null
  device: string | null
  duration_ms: number
  max_scroll: number
  furthest_section: string | null
  section_ms: Record<string, number> | null
  signup_click: boolean
}

const card =
  "rounded-2xl border border-white/80 bg-white/70 p-5 shadow-[0_1px_0_rgba(22,21,26,0.04),0_8px_24px_-12px_rgba(217,70,122,0.25)] backdrop-blur-xl"
const grad = "bg-gradient-to-r from-[#D9467A] to-[#EE7C55]"

function dur(ms: number) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
}
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
function median(xs: number[]) {
  if (!xs.length) return 0
  const a = [...xs].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
function source(v: Visit) {
  if (v.utm_source) return v.utm_source.toLowerCase()
  if (!v.referrer) return "Direct / typed in"
  try {
    return new URL(v.referrer).hostname.replace(/^www\./, "").replace(/^(l|m|lm)\./, "")
  } catch {
    return "Other"
  }
}

export default async function AdminSitePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const { d } = await searchParams
  const days = RANGES.includes(Number(d)) ? Number(d) : 30
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data, error } = await createAdminClient()
    .from("site_visits")
    .select("referrer, utm_source, device, duration_ms, max_scroll, furthest_section, section_ms, signup_click")
    .eq("path", "/")
    .gte("first_seen", since)
    .order("first_seen", { ascending: false })
    .limit(20000)

  const visits = (data ?? []) as Visit[]
  const total = visits.length

  // How many visits got at least as far as each section.
  const idx = (k: string | null) => Math.max(0, SECTIONS.findIndex((s) => s.key === k))
  const reached = SECTIONS.map((_, i) => visits.filter((v) => idx(v.furthest_section) >= i).length)

  // Biggest single drop between two neighbouring sections.
  let worst = { i: -1, lost: 0 }
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const lost = reached[i] - reached[i + 1]
    if (lost > worst.lost) worst = { i, lost }
  }

  // Average time looking at each section, among the visits that reached it.
  const sectionTime = SECTIONS.map((s, i) => {
    const xs = visits.map((v) => v.section_ms?.[s.key] ?? 0).filter((ms, j) => idx(visits[j].furthest_section) >= i)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
  })
  const maxTime = Math.max(1, ...sectionTime)
  const topTime = sectionTime.indexOf(Math.max(...sectionTime))

  const medianTime = median(visits.map((v) => v.duration_ms))
  const signups = visits.filter((v) => v.signup_click).length
  const pricingIdx = SECTIONS.findIndex((s) => s.key === "pricing")

  const tally = (f: (v: Visit) => string) => {
    const m = new Map<string, number>()
    visits.forEach((v) => m.set(f(v), (m.get(f(v)) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const sources = tally(source).slice(0, 8)
  const devices = tally((v) => v.device ?? "unknown")

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Site</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
          How people move through{" "}
          <em className={`${grad} bg-clip-text pr-1 font-serif italic text-transparent`}>the home page</em>
        </h1>
        <div className="flex gap-1 rounded-full bg-white/70 p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/site?d=${r}`}
              className={
                r === days
                  ? "rounded-full bg-[#16151a] px-3.5 py-1.5 font-medium text-white"
                  : "rounded-full px-3.5 py-1.5 font-medium text-[#16151a]/60 hover:text-[#16151a]"
              }
            >
              {r} days
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-sm text-[#16151a]/60">
        Visits to marvberry.com in the last {days} days. Your own devices are left out once you open marvberry.com/?notrack=1 on them.
      </p>

      {error && (
        <p className={`${card} mt-8 text-sm text-[#16151a]/70`}>Couldn’t load visits: {error.message}</p>
      )}

      {!error && total === 0 && (
        <p className={`${card} mt-8 text-sm text-[#16151a]/60`}>
          No visits yet. They start showing here as soon as people land on the home page.
        </p>
      )}

      {total > 0 && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["Visits", total.toLocaleString("en-US")],
              ["Typical time on page", dur(medianTime)],
              ["Reached pricing", `${pct(reached[pricingIdx], total)}%`],
              ["Tapped a sign-up button", `${pct(signups, total)}%`],
            ].map(([label, value]) => (
              <div key={label} className={card}>
                <p className="text-xs font-medium text-[#16151a]/55">{label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={card}>
              <p className="text-sm font-semibold">Where you lose people</p>
              <p className="mt-1 text-sm text-[#16151a]/60">
                {worst.i >= 0 ? (
                  <>
                    Biggest drop: <b className="text-[#16151a]">{pct(worst.lost, total)}%</b> of visitors leave at{" "}
                    <b className="text-[#16151a]">{SECTIONS[worst.i].label}</b> and never see the next section.
                  </>
                ) : (
                  "Nobody has left partway yet."
                )}
              </p>
              <div className="mt-4 space-y-2.5">
                {SECTIONS.map((s, i) => (
                  <div key={s.key}>
                    <div className="flex justify-between text-xs">
                      <span className={i === worst.i ? "font-semibold text-[#D9467A]" : "text-[#16151a]/70"}>
                        {s.label}
                      </span>
                      <span className="tabular-nums text-[#16151a]/55">{pct(reached[i], total)}% still here</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#16151a]/[0.06]">
                      <div className={`h-2 rounded-full ${grad}`} style={{ width: `${pct(reached[i], total)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={card}>
              <p className="text-sm font-semibold">Where they spend the most time</p>
              <p className="mt-1 text-sm text-[#16151a]/60">
                Most time on <b className="text-[#16151a]">{SECTIONS[topTime].label}</b>. Average seconds on screen, counting
                only people who reached that section.
              </p>
              <div className="mt-4 space-y-2.5">
                {SECTIONS.map((s, i) => (
                  <div key={s.key}>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#16151a]/70">{s.label}</span>
                      <span className="tabular-nums text-[#16151a]/55">{dur(sectionTime[i])}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#16151a]/[0.06]">
                      <div
                        className="h-2 rounded-full bg-[#16151a]/70"
                        style={{ width: `${Math.round((sectionTime[i] / maxTime) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={card}>
              <p className="text-sm font-semibold">Where they came from</p>
              <ul className="mt-3 divide-y divide-[#16151a]/[0.06] text-sm">
                {sources.map(([name, n]) => (
                  <li key={name} className="flex justify-between py-2">
                    <span className="truncate text-[#16151a]/80">{name}</span>
                    <span className="tabular-nums text-[#16151a]/55">
                      {n} · {pct(n, total)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={card}>
              <p className="text-sm font-semibold">Device</p>
              <ul className="mt-3 divide-y divide-[#16151a]/[0.06] text-sm">
                {devices.map(([name, n]) => (
                  <li key={name} className="flex justify-between py-2 capitalize">
                    <span className="text-[#16151a]/80">{name}</span>
                    <span className="tabular-nums text-[#16151a]/55">
                      {n} · {pct(n, total)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
