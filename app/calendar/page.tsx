import Link from "next/link"
import { redirect } from "next/navigation"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { daysUntil } from "@/lib/due"
import { feedToken } from "@/lib/feed"
import AppShell from "@/app/app-shell"
import { addClientFromBooking } from "@/app/clients/actions"
import { CopyButton } from "./phone-link"

export const dynamic = "force-dynamic"

type Booking = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  meeting_type: string
  slot_start: string
  looking_to: string | null
}
type Due = {
  id: string
  title: string
  due_on: string
  client_id: string
  clients: { first_name: string | null } | null
}

const pad = (n: number) => String(n).padStart(2, "0")
const DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const WORDS = ["Nothing", "One thing", "Two things", "Three things", "Four things", "Five things", "Six things", "Seven things", "Eight things", "Nine things", "Ten things"]

function hourLabel(h: number) {
  const n = h % 12 === 0 ? 12 : h % 12
  return `${n}:00 ${h < 12 || h === 24 ? "AM" : "PM"}`
}

// "Monday to Friday" style rows from the ISO weekdays (1 = Monday) an agent works.
function hoursRows(weekdays: number[], start: number, end: number) {
  const on = new Set(weekdays)
  const rows: { label: string; on: boolean }[] = []
  let i = 1
  while (i <= 7) {
    const state = on.has(i)
    let j = i
    while (j < 7 && on.has(j + 1) === state) j++
    rows.push({ label: i === j ? DAY[i - 1] : `${DAY[i - 1]} to ${DAY[j - 1]}`, on: state })
    i = j + 1
  }
  return rows.map((r) => ({ ...r, value: r.on ? `${hourLabel(start)} to ${hourLabel(end)}` : "Off" }))
}

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: agentData } = await supabase.from("agents").select(AGENT_SELECT).eq("id", user.id).maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) redirect("/login")

  const tz = agent.timezone || "America/New_York"
  const now = new Date()
  const todayKey = formatInTimeZone(now, tz, "yyyy-MM-dd")
  const monthStart = fromZonedTime(`${todayKey.slice(0, 8)}01T00:00:00`, tz)
  const minutes = agent.slot_minutes || 30

  const [{ data: bookingData }, { data: clientRows }, { data: dueData }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, first_name, last_name, phone, meeting_type, slot_start, looking_to")
      .gte("slot_start", monthStart.toISOString())
      .order("slot_start", { ascending: true }),
    supabase.from("clients").select("id, booking_id").not("booking_id", "is", null),
    supabase
      .from("steps")
      .select("id, title, due_on, client_id, clients(first_name)")
      .eq("done", false)
      .not("due_on", "is", null)
      .order("due_on", { ascending: true }),
  ])

  const bookings = (bookingData ?? []) as Booking[]
  const clientOf = new Map((clientRows ?? []).map((c) => [c.booking_id as string, c.id as string]))
  const allDue = (dueData ?? []) as unknown as Due[]
  const due = allDue.filter((d) => daysUntil(d.due_on, tz) <= 0)

  const keyOf = (iso: string) => formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd")
  const timeOf = (d: Date) => formatInTimeZone(d, tz, "h:mm")
  const today = bookings.filter((b) => keyOf(b.slot_start) === todayKey)
  const later = bookings.filter((b) => keyOf(b.slot_start) > todayKey).slice(0, 6)

  // Today's open time, inside the hours the realtor set.
  const weekday = Number(formatInTimeZone(now, tz, "i"))
  const working = agent.weekdays.includes(weekday)
  const dayStart = fromZonedTime(`${todayKey}T${pad(agent.day_start)}:00:00`, tz)
  const dayEnd = fromZonedTime(`${todayKey}T${pad(agent.day_end)}:00:00`, tz)
  const bookableFrom = now.getTime() + (agent.min_notice_hours ?? 0) * 3600000

  type Row =
    | { kind: "event"; b: Booking; start: Date }
    | { kind: "open"; from: Date; until: Date | null }
    | { kind: "now" }
  const rows: Row[] = []
  let cursor = new Date(Math.max(now.getTime(), dayStart.getTime()))
  let nowPlaced = false
  const placeNow = () => {
    if (!nowPlaced) rows.push({ kind: "now" })
    nowPlaced = true
  }
  for (const b of today) {
    const start = new Date(b.slot_start)
    const end = new Date(start.getTime() + minutes * 60000)
    if (end.getTime() > now.getTime()) {
      placeNow()
      if (working && start.getTime() - cursor.getTime() >= minutes * 60000 && start.getTime() <= dayEnd.getTime()) {
        rows.push({ kind: "open", from: cursor, until: start })
      }
    }
    rows.push({ kind: "event", b, start })
    if (end.getTime() > cursor.getTime()) cursor = end
  }
  placeNow()
  const openTail = working && dayEnd.getTime() - cursor.getTime() >= minutes * 60000
  if (openTail) rows.push({ kind: "open", from: cursor, until: null })

  const count = today.length
  const headline = `${WORDS[count] ?? `${count} things`} on your calendar today.`
  const tail = !working
    ? " It's your day off."
    : openTail
      ? count === 0 && cursor.getTime() === dayStart.getTime()
        ? " Your whole day is open."
        : ` You're open from ${timeOf(cursor)} on.`
      : ""

  // The small month.
  const year = Number(todayKey.slice(0, 4))
  const month = Number(todayKey.slice(5, 7))
  const dayNum = Number(todayKey.slice(8, 10))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const busy = new Set<number>()
  for (const b of bookings) {
    const k = keyOf(b.slot_start)
    if (k.slice(0, 7) === todayKey.slice(0, 7)) busy.add(Number(k.slice(8, 10)))
  }
  for (const d of allDue) if (d.due_on.slice(0, 7) === todayKey.slice(0, 7)) busy.add(Number(d.due_on.slice(8, 10)))

  const bookingUrl = `www.marvberry.com/book/${agent.slug}`
  const feedPath = `www.marvberry.com/api/calendar/${feedToken(agent.id)}`

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <h1 className="font-[Georgia,serif] text-3xl tracking-tight sm:text-4xl">{formatInTimeZone(now, tz, "EEEE, MMMM d")}.</h1>
        <p className="mt-3 text-[15px] text-[#5d5b62]">
          {headline}
          {tail}
        </p>

        <div className="mt-9 flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            {due.length > 0 && (
              <div className="mb-6 flex gap-4 sm:gap-5">
                <div className="w-14 shrink-0 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[.1em] text-[#8e8c93] sm:w-[76px]">Due</div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {due.map((d) => {
                    const late = daysUntil(d.due_on, tz) < 0
                    return (
                      <Link
                        key={d.id}
                        href={`/clients/${d.client_id}?step=${d.id}#step-${d.id}`}
                        className={`rounded-full border px-3.5 py-1.5 text-[13px] ${
                          late ? "border-[#f3d3de] bg-[#fdf1f5] text-[#c23d6d]" : "border-[#e3e0dc] bg-white text-[#5d5b62]"
                        }`}
                      >
                        {d.clients?.first_name?.trim() || "Client"}: {d.title} · {late ? "past due" : "due today"}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {rows.map((r, i) => {
                if (r.kind === "now") {
                  return (
                    <div key="now" className="flex items-center gap-4 sm:gap-5">
                      <div className="w-14 shrink-0 text-right text-[11px] font-medium uppercase tracking-[.1em] text-[#D9467A] sm:w-[76px]">Now</div>
                      <div className="flex flex-1 items-center">
                        <span className="h-2 w-2 rounded-full bg-[#D9467A]" />
                        <span className="h-px flex-1 bg-[#D9467A]/50" />
                      </div>
                    </div>
                  )
                }
                if (r.kind === "open") {
                  const canBook = (r.until ?? dayEnd).getTime() - Math.max(r.from.getTime(), bookableFrom) >= minutes * 60000
                  return (
                    <div key={`open-${i}`} className="flex gap-4 sm:gap-5">
                      <div className="w-14 shrink-0 pt-3 text-right sm:w-[76px]">
                        <p className="font-[Georgia,serif] text-[15px] leading-none text-[#8e8c93]">{timeOf(r.from)}</p>
                      </div>
                      <div className="flex-1 rounded-2xl border border-dashed border-[#d6d2cc] px-5 py-3">
                        <p className="font-[Georgia,serif] text-[14px] italic text-[#8a8072]">
                          {r.until ? `Open until ${timeOf(r.until)}.` : "Open the rest of the day."}
                          {canBook ? " Clients can book this." : ""}
                        </p>
                      </div>
                    </div>
                  )
                }
                const b = r.b
                const clientId = clientOf.get(b.id)
                const over = r.start.getTime() + minutes * 60000 <= now.getTime()
                return (
                  <div key={b.id} className={`flex gap-4 sm:gap-5 ${over ? "opacity-55" : ""}`}>
                    <div className="w-14 shrink-0 pt-4 text-right sm:w-[76px]">
                      <p className="font-[Georgia,serif] text-[17px] leading-none">{timeOf(r.start)}</p>
                      <p className="mt-1.5 text-[12px] text-[#8e8c93]">{minutes} min</p>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3e0dc] bg-white py-4 pl-5 pr-4">
                      <div className="flex items-stretch gap-4">
                        <span className="w-[3px] rounded-full bg-ink" />
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[.1em] text-[#8e8c93]">
                            Consultation · {b.meeting_type === "phone" ? "Phone" : "Video"}
                          </p>
                          <p className="mt-1 text-[16px] font-medium">
                            {b.first_name} {b.last_name}
                          </p>
                          <p className="mt-0.5 text-[13.5px] text-[#5d5b62]">
                            {[b.looking_to ? `Looking to ${b.looking_to.toLowerCase()}` : "Booked from your link", b.phone].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      {clientId ? (
                        <Link href={`/clients/${clientId}`} className="rounded-[9px] border border-[#e3e0dc] bg-white px-3.5 py-2 text-[13px] font-medium hover:border-ink/30">
                          Open client
                        </Link>
                      ) : (
                        <form action={addClientFromBooking}>
                          <input type="hidden" name="bookingId" value={b.id} />
                          <button type="submit" className="rounded-[9px] border border-[#e3e0dc] bg-white px-3.5 py-2 text-[13px] font-medium hover:border-ink/30">
                            Add as client
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-9 flex gap-4 sm:gap-5">
              <div className="hidden w-[76px] shrink-0 sm:block" />
              <div className="flex-1 border-t border-[#e3e0dc] pt-6">
                <div className="flex items-baseline justify-between">
                  <p className="font-[Georgia,serif] text-[19px]">Coming up</p>
                  <Link href="/bookings" className="text-[13px] text-[#5d5b62] underline underline-offset-4 hover:text-ink">
                    Every consultation
                  </Link>
                </div>
                {later.length === 0 ? (
                  <p className="mt-3 text-[14.5px] text-[#5d5b62]">Nothing booked after today yet.</p>
                ) : (
                  <div className="mt-3 divide-y divide-[#ebe8e4] text-[14.5px]">
                    {later.map((b) => (
                      <div key={b.id} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0">
                          <span className="mr-4 font-[Georgia,serif] text-[#8e8c93]">{formatInTimeZone(new Date(b.slot_start), tz, "EEE, MMM d · h:mm a")}</span>
                          Consultation with {b.first_name} {b.last_name}
                        </span>
                        <span className="shrink-0 text-[13px] text-[#8e8c93]">{b.meeting_type === "phone" ? "Phone" : "Video"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 space-y-4 lg:w-[300px]">
            <div className="rounded-2xl border border-[#e3e0dc] bg-white p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-[Georgia,serif] text-[17px]">{formatInTimeZone(now, tz, "MMMM")}</p>
                <p className="text-[12px] text-[#8e8c93]">{year}</p>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-y-1.5 text-center text-[12px]">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className="text-[10.5px] text-[#8e8c93]">{d}</span>
                ))}
                {Array.from({ length: lead }).map((_, i) => (
                  <span key={`l${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1
                  const isToday = d === dayNum
                  return (
                    <span
                      key={d}
                      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                        isToday ? "bg-ink font-medium text-white" : d < dayNum ? "text-[#b9b6b1]" : ""
                      }`}
                    >
                      {d}
                      {busy.has(d) && (
                        <i className={`absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full ${isToday ? "bg-white" : "bg-[#D9467A]"}`} />
                      )}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e0dc] bg-white p-5">
              <p className="font-[Georgia,serif] text-[17px]">On your phone</p>
              <p className="mt-1 text-[13px] text-[#5d5b62]">Add it once. Every booking and due date shows up in your phone&rsquo;s calendar.</p>
              <a href={`webcal://${feedPath}`} className="mt-4 block rounded-[10px] bg-ink px-4 py-2.5 text-center text-[13px] font-medium text-paper hover:opacity-90">
                Add to my phone
              </a>
              <div className="mt-3 text-center">
                <CopyButton value={`https://${feedPath}`} label="Copy the link instead" />
              </div>
            </div>

            <div className="rounded-2xl border border-[#e3e0dc] bg-white p-5">
              <p className="font-[Georgia,serif] text-[17px]">Your hours</p>
              <p className="mt-1 text-[13px] text-[#5d5b62]">When clients can book you.</p>
              <div className="mt-4 space-y-2 text-[13.5px]">
                {hoursRows(agent.weekdays, agent.day_start, agent.day_end).map((r) => (
                  <div key={r.label} className="flex justify-between gap-3">
                    <span>{r.label}</span>
                    <span className={r.on ? "text-[#5d5b62]" : "text-[#8e8c93]"}>{r.value}</span>
                  </div>
                ))}
              </div>
              <Link href="/settings" className="mt-4 inline-block text-[13px] underline underline-offset-4">
                Change hours
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e6ddce] bg-[#faf7f1] p-5">
              <p className="font-[Georgia,serif] text-[17px]">Your booking link</p>
              <p className="mt-1 text-[13px] text-[#6d655b]">Share it once. Your open times stay current.</p>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-[10px] border border-[#e6ddce] bg-white py-2 pl-3 pr-2 text-[13px]">
                <span className="min-w-0 truncate">{bookingUrl.replace("www.", "")}</span>
                <CopyButton value={`https://${bookingUrl}`} dark />
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
