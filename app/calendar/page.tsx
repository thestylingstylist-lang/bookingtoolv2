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
import AddEvent from "./add-event"
import WeekView, { addDays, type WeekItem, type WeekDue } from "./week-view"
import { deleteEvent } from "./actions"
import RowMenu from "@/app/row-menu"
import { CONSULT_COLOR, kindMeta, lengthLabel } from "@/lib/events"

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
type EventRow = { id: string; kind: string; place: string; starts_at: string; ends_at: string; client_id: string | null }
type Item = {
  id: string
  start: Date
  end: Date
  color: string
  meta: string
  title: string
  sub: string
  line: string // one-line version for "Coming up"
  tag: string // the short second line on the week grid
  booking?: Booking
  event?: EventRow
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

const NOTES: Record<string, { ok: boolean; text: string }> = {
  added: { ok: true, text: "It's on your calendar." },
  removed: { ok: true, text: "Removed from your calendar." },
  times: { ok: false, text: "The end time comes after the start time. Give it another go." },
  details: { ok: false, text: "Pick a day, a start and an end, and I'll add it." },
  save: { ok: false, text: "That didn't save. Try again." },
  setup: { ok: false, text: "Showings, closings and open houses switch on with one quick step in Supabase. Once that's done, add it again." },
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; removed?: string; error?: string; view?: string; w?: string }>
}) {
  const sp = await searchParams
  const note = sp.error ? NOTES[sp.error] : sp.added ? NOTES.added : sp.removed ? NOTES.removed : null
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

  // Week view: any day in ?w= picks its week, Monday first. No ?w= means this week.
  const week = sp.view === "week"
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.w ?? "") ? (sp.w as string) : todayKey
  const monday = addDays(anchor, -((new Date(`${anchor}T12:00:00Z`).getUTCDay() + 6) % 7))
  const thisMonday = addDays(todayKey, -((new Date(`${todayKey}T12:00:00Z`).getUTCDay() + 6) % 7))
  const weekStart = fromZonedTime(`${monday}T00:00:00`, tz)
  const rangeStart = week && weekStart < monthStart ? weekStart : monthStart
  const minutes = agent.slot_minutes || 30

  const [{ data: bookingData }, { data: clientRows }, { data: dueData }, { data: eventData }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, first_name, last_name, phone, meeting_type, slot_start, looking_to")
      .gte("slot_start", rangeStart.toISOString())
      .order("slot_start", { ascending: true }),
    supabase.from("clients").select("id, first_name, last_name, booking_id").order("first_name", { ascending: true }),
    supabase
      .from("steps")
      .select("id, title, due_on, client_id, clients(first_name)")
      .eq("done", false)
      .not("due_on", "is", null)
      .order("due_on", { ascending: true }),
    // Quietly empty until the events table exists.
    supabase
      .from("events")
      .select("id, kind, place, starts_at, ends_at, client_id")
      .gte("ends_at", rangeStart.toISOString())
      .order("starts_at", { ascending: true }),
  ])

  const bookings = (bookingData ?? []) as Booking[]
  const clientList = (clientRows ?? []) as { id: string; first_name: string | null; last_name: string | null; booking_id: string | null }[]
  const clientOf = new Map(clientList.filter((c) => c.booking_id).map((c) => [c.booking_id as string, c.id]))
  const nameOf = new Map(clientList.map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Client"]))
  const events = (eventData ?? []) as EventRow[]
  const allDue = (dueData ?? []) as unknown as Due[]
  const due = allDue.filter((d) => daysUntil(d.due_on, tz) <= 0)

  const timeOf = (d: Date) => formatInTimeZone(d, tz, "h:mm")

  // Everything on the calendar, consultations and hand-added events, as one list.
  const items: Item[] = [
    ...bookings.map((b): Item => {
      const start = new Date(b.slot_start)
      const how = b.meeting_type === "phone" ? "Phone" : "Video"
      const name = `${b.first_name} ${b.last_name}`.trim()
      return {
        id: b.id,
        start,
        end: new Date(start.getTime() + minutes * 60000),
        color: CONSULT_COLOR,
        meta: `Consultation · ${how}`,
        title: name,
        sub: [b.looking_to ? `Looking to ${b.looking_to.toLowerCase()}` : "Booked from your link", b.phone].filter(Boolean).join(" · "),
        line: `Consultation with ${name}`,
        tag: "Consultation",
        booking: b,
      }
    }),
    ...events.map((e): Item => {
      const k = kindMeta(e.kind)
      const who = e.client_id ? nameOf.get(e.client_id) : undefined
      return {
        id: e.id,
        start: new Date(e.starts_at),
        end: new Date(e.ends_at),
        color: k.color,
        meta: k.label,
        title: e.place || k.label,
        sub: who ? `With ${who}` : e.place ? "" : "No address yet",
        line: [e.place ? `${k.label} at ${e.place}` : k.label, who ? `with ${who}` : ""].filter(Boolean).join(", "),
        tag: [k.label, who?.split(" ")[0]].filter(Boolean).join(", "),
        event: e,
      }
    }),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())
  const dayKey = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd")
  const today = items.filter((it) => dayKey(it.start) === todayKey)
  const later = items.filter((it) => dayKey(it.start) > todayKey).slice(0, 8)

  // Today's open time, inside the hours the realtor set.
  const weekday = Number(formatInTimeZone(now, tz, "i"))
  const working = agent.weekdays.includes(weekday)
  const dayStart = fromZonedTime(`${todayKey}T${pad(agent.day_start)}:00:00`, tz)
  const dayEnd = fromZonedTime(`${todayKey}T${pad(agent.day_end)}:00:00`, tz)
  const bookableFrom = now.getTime() + (agent.min_notice_hours ?? 0) * 3600000

  type Row =
    | { kind: "event"; it: Item }
    | { kind: "open"; from: Date; until: Date | null }
    | { kind: "now" }
  const rows: Row[] = []
  let cursor = new Date(Math.max(now.getTime(), dayStart.getTime()))
  let nowPlaced = false
  const placeNow = () => {
    if (!nowPlaced) rows.push({ kind: "now" })
    nowPlaced = true
  }
  for (const it of today) {
    const { start, end } = it
    if (end.getTime() > now.getTime()) {
      placeNow()
      if (working && start.getTime() - cursor.getTime() >= minutes * 60000 && start.getTime() <= dayEnd.getTime()) {
        rows.push({ kind: "open", from: cursor, until: start })
      }
    }
    rows.push({ kind: "event", it })
    if (end.getTime() > cursor.getTime()) cursor = end
  }
  placeNow()
  const openTail = working && dayEnd.getTime() - cursor.getTime() >= minutes * 60000
  if (openTail) rows.push({ kind: "open", from: cursor, until: null })

  // The week, when that's the view.
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const weekItems = items.filter((it) => weekDays.includes(dayKey(it.start)))
  const weekGrid: WeekItem[] = weekItems.map((it) => ({
    id: it.id,
    start: it.start,
    end: it.end,
    color: it.color,
    title: it.title,
    tag: it.tag,
    href: it.booking ? (clientOf.get(it.booking.id) ? `/clients/${clientOf.get(it.booking.id)}` : "/bookings") : it.event?.client_id ? `/clients/${it.event.client_id}` : undefined,
  }))
  const weekDue: WeekDue[] = allDue
    .filter((d) => weekDays.includes(d.due_on))
    .map((d) => ({
      id: d.id,
      day: d.due_on,
      late: daysUntil(d.due_on, tz) < 0,
      href: `/clients/${d.client_id}?step=${d.id}#step-${d.id}`,
      label: `${d.clients?.first_name?.trim() || "Client"}: ${d.title}`,
    }))
  const openDays = weekDays.filter(
    (d, i) => d >= todayKey && agent.weekdays.includes(i + 1) && !weekItems.some((it) => dayKey(it.start) === d)
  )
  const openNames = openDays.map((d) => DAY[weekDays.indexOf(d)])
  const weekTail =
    weekItems.length === 0 || openNames.length === 0
      ? ""
      : openNames.length === 1
        ? ` ${openNames[0]} is wide open.`
        : openNames.length === 2
          ? ` ${openNames[0]} and ${openNames[1]} are wide open.`
          : ` ${WORDS[openNames.length].replace(" things", "")} days are wide open.`
  const sunday = weekDays[6]
  const mName = (k: string) => formatInTimeZone(new Date(`${k}T12:00:00Z`), "UTC", "MMMM")
  const weekTitle =
    monday.slice(0, 7) === sunday.slice(0, 7)
      ? `${mName(monday)} ${Number(monday.slice(8))} to ${Number(sunday.slice(8))}.`
      : `${mName(monday)} ${Number(monday.slice(8))} to ${mName(sunday)} ${Number(sunday.slice(8))}.`
  const weekHeadline = `${WORDS[weekItems.length] ?? `${weekItems.length} things`} ${monday === thisMonday ? "this week" : "that week"}.`

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
  for (const it of items) {
    const k = dayKey(it.start)
    if (k.slice(0, 7) === todayKey.slice(0, 7)) busy.add(Number(k.slice(8, 10)))
  }
  for (const d of allDue) if (d.due_on.slice(0, 7) === todayKey.slice(0, 7)) busy.add(Number(d.due_on.slice(8, 10)))

  const bookingUrl = `www.marvberry.com/book/${agent.slug}`
  const feedPath = `www.marvberry.com/api/calendar/${feedToken(agent.id)}`

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[Georgia,serif] text-3xl tracking-tight sm:text-4xl">{week ? weekTitle : `${formatInTimeZone(now, tz, "EEEE, MMMM d")}.`}</h1>
            <p className="mt-3 text-[15px] text-[#5d5b62]">
              {week ? weekHeadline : headline}
              {week ? weekTail : tail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {week && (
              <div className="flex items-center gap-1 text-[13px] text-[#5d5b62]">
                <Link href={`/calendar?view=week&w=${addDays(monday, -7)}`} aria-label="Earlier week" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:text-ink">&lsaquo;</Link>
                {monday !== thisMonday && (
                  <Link href="/calendar?view=week" className="px-1 underline underline-offset-4 hover:text-ink">This week</Link>
                )}
                <Link href={`/calendar?view=week&w=${addDays(monday, 7)}`} aria-label="Later week" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white hover:text-ink">&rsaquo;</Link>
              </div>
            )}
            <div className="inline-flex rounded-[10px] bg-[#e9e7e3] p-[3px] text-[13px]">
              {[
                { label: "Today", href: "/calendar", on: !week },
                { label: "Week", href: "/calendar?view=week", on: week },
              ].map((t) => (
                <Link
                  key={t.label}
                  href={t.href}
                  className={`rounded-[8px] px-4 py-1.5 ${t.on ? "bg-white font-medium shadow-[0_1px_2px_rgba(22,21,26,.12)]" : "text-[#5d5b62] hover:text-ink"}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          <AddEvent
            clients={clientList.map((c) => ({ id: c.id, name: nameOf.get(c.id) ?? "Client" }))}
            today={todayKey}
            start={`${pad(Math.min(Number(formatInTimeZone(now, tz, "H")) + 1, 22))}:00`}
            end={`${pad(Math.min(Number(formatInTimeZone(now, tz, "H")) + 2, 23))}:00`}
          />
          </div>
        </div>
        {note && (
          <p className={`mt-6 rounded-lg px-4 py-2.5 text-sm ${note.ok ? "bg-[#e5f1f0] text-sage" : "bg-[#fdf1f5] text-[#c23d6d]"}`}>{note.text}</p>
        )}

        {week ? (
          <WeekView
            monday={monday}
            todayKey={todayKey}
            now={now}
            tz={tz}
            items={weekGrid}
            due={weekDue}
            weekdays={agent.weekdays}
            dayStart={agent.day_start}
            dayEnd={agent.day_end}
          />
        ) : (
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
                const it = r.it
                const b = it.booking
                const clientId = b ? clientOf.get(b.id) : it.event?.client_id ?? undefined
                const over = it.end.getTime() <= now.getTime()
                return (
                  <div key={it.id} className={`flex gap-4 sm:gap-5 ${over ? "opacity-55" : ""}`}>
                    <div className="w-14 shrink-0 pt-4 text-right sm:w-[76px]">
                      <p className="font-[Georgia,serif] text-[17px] leading-none">{timeOf(it.start)}</p>
                      <p className="mt-1.5 text-[12px] text-[#8e8c93]">{lengthLabel(it.end.getTime() - it.start.getTime())}</p>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3e0dc] bg-white py-4 pl-5 pr-3">
                      <div className="flex min-w-0 items-stretch gap-4">
                        <span className="w-[3px] shrink-0 rounded-full" style={{ background: it.color }} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[.1em] text-[#8e8c93]">{it.meta}</p>
                          <p className="mt-1 text-[16px] font-medium">{it.title}</p>
                          {it.sub && <p className="mt-0.5 text-[13.5px] text-[#5d5b62]">{it.sub}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {it.event?.place && (
                          <a
                            href={`https://maps.apple.com/?q=${encodeURIComponent(it.event.place)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-[9px] border border-[#e3e0dc] bg-white px-3.5 py-2 text-[13px] font-medium hover:border-ink/30"
                          >
                            Directions
                          </a>
                        )}
                        {b &&
                          (clientId ? (
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
                          ))}
                        {it.event && (
                          <RowMenu action={deleteEvent} id={it.event.id} label={it.title} confirmText="Take this off your calendar?" />
                        )}
                      </div>
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
                  <p className="mt-3 text-[14.5px] text-[#5d5b62]">Nothing after today yet.</p>
                ) : (
                  <div className="mt-3 divide-y divide-[#ebe8e4] text-[14.5px]">
                    {later.map((it) => (
                      <div key={it.id} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0">
                          <span className="mr-3 inline-block h-2 w-2 rounded-full align-middle" style={{ background: it.color }} />
                          <span className="mr-4 font-[Georgia,serif] text-[#8e8c93]">{formatInTimeZone(it.start, tz, "EEE, MMM d · h:mm a")}</span>
                          {it.line}
                        </span>
                        <span className="shrink-0 text-[13px] text-[#8e8c93]">
                          {it.booking ? (it.booking.meeting_type === "phone" ? "Phone" : "Video") : lengthLabel(it.end.getTime() - it.start.getTime())}
                        </span>
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
        )}
      </main>
    </AppShell>
  )
}
