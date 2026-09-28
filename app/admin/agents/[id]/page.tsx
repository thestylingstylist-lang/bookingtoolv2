import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { statusOf, PILL, fmtDate, MONTHLY_PRICE } from "@/lib/admin-status"

export const dynamic = "force-dynamic"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function hour(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  const d = new Date(2000, 0, 1, hh, mm)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: mm ? "2-digit" : undefined })
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={"rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-xl " + className}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#16151a]/45">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#16151a]/6 py-2 text-sm last:border-0">
      <span className="text-[#16151a]/50">{label}</span>
      <span className="text-right font-medium text-[#16151a] [overflow-wrap:anywhere]">{value || "—"}</span>
    </div>
  )
}

export default async function AdminAgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const { id } = await params
  const admin = createAdminClient()

  const { data: agentData } = await admin.from("agents").select("*").eq("id", id).maybeSingle()
  if (!agentData) notFound()
  const a = agentData as Record<string, any>

  const nowIso = new Date().toISOString()
  const [authRes, clientsRes, upcomingRes, pastRes, bookingCount, msgRes] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin
      .from("clients")
      .select("id, first_name, last_name, email, phone, created_at")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("bookings")
      .select("id, first_name, last_name, email, meeting_type, slot_start")
      .eq("agent_id", id)
      .gte("slot_start", nowIso)
      .order("slot_start", { ascending: true })
      .limit(10),
    admin
      .from("bookings")
      .select("id, first_name, last_name, email, meeting_type, slot_start")
      .eq("agent_id", id)
      .lt("slot_start", nowIso)
      .order("slot_start", { ascending: false })
      .limit(10),
    admin.from("bookings").select("id", { count: "exact", head: true }).eq("agent_id", id),
    admin
      .from("support_messages")
      .select("id, from_team, read_by_team")
      .eq("agent_id", id),
  ])

  const authUser = authRes.data?.user
  const loginEmail = authUser?.email || ""
  const lastSignIn = authUser?.last_sign_in_at || null
  const clients = (clientsRes.data ?? []) as any[]
  const upcoming = (upcomingRes.data ?? []) as any[]
  const past = (pastRes.data ?? []) as any[]
  const totalBookings = bookingCount.count ?? 0
  const msgs = (msgRes.data ?? []) as any[]
  const unread = msgs.filter((m) => !m.from_team && !m.read_by_team).length

  const st = statusOf({ subscription_status: a.subscription_status ?? null, trial_ends_at: a.trial_ends_at ?? null })
  const weekdays: number[] = Array.isArray(a.weekdays) ? a.weekdays : []
  const bookingUrl = a.slug ? `https://www.marvberry.com/book/${a.slug}` : ""

  const BookingList = ({ items, empty }: { items: any[]; empty: string }) =>
    items.length === 0 ? (
      <p className="py-2 text-sm text-[#16151a]/45">{empty}</p>
    ) : (
      <ul>
        {items.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 border-b border-[#16151a]/6 py-2 text-sm last:border-0">
            <span className="min-w-0">
              <span className="font-medium text-[#16151a]">{`${b.first_name} ${b.last_name}`.trim()}</span>
              <span className="block truncate text-xs text-[#16151a]/45">{b.email}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-[#16151a]/60">
              {fmtDate(b.slot_start, true)}
              <span className="block capitalize text-[#16151a]/40">{b.meeting_type}</span>
            </span>
          </li>
        ))}
      </ul>
    )

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <Link href="/admin/agents" className="text-sm font-medium text-[#16151a]/55 hover:text-[#16151a]">← All agents</Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#16151a]">{a.business_name || a.full_name || "Agent"}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${PILL[st.key]}`}>{st.label}</span>
      </div>
      <p className="mt-1 text-sm text-[#16151a]/55">
        {a.full_name}{a.full_name && loginEmail ? " · " : ""}{loginEmail}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/admin/messages?a=${id}`}
          className="rounded-full bg-gradient-to-r from-[#D9467A] to-[#EE7C55] px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Message {a.full_name ? a.full_name.split(" ")[0] : "agent"}{unread ? ` · ${unread} unread` : ""}
        </Link>
        {bookingUrl && (
          <a href={bookingUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#16151a]/15 bg-white px-4 py-2 text-sm font-medium text-[#16151a]">
            Open booking page ↗
          </a>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Clients", clients.length],
          ["Bookings", totalBookings],
          ["Upcoming", upcoming.length],
          ["Worth / month", st.key === "paying" ? `$${MONTHLY_PRICE}` : "$0"],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border border-white/80 bg-white/70 p-4 backdrop-blur-xl">
            <p className="text-xs font-medium text-[#16151a]/50">{k}</p>
            <p className="mt-1 text-2xl font-semibold text-[#16151a]">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Account">
          <Row label="Login email" value={loginEmail} />
          <Row label="Joined" value={fmtDate(a.created_at)} />
          <Row label="Last signed in" value={fmtDate(lastSignIn, true)} />
          <Row label="Status" value={st.label} />
          <Row label="Stripe status" value={a.subscription_status || "none"} />
          <Row label="Trial ends" value={fmtDate(a.trial_ends_at)} />
          {a.stripe_customer_id && <Row label="Stripe customer" value={a.stripe_customer_id} />}
        </Card>

        <Card title="Contact">
          <Row label="Name" value={a.full_name} />
          <Row label="Business" value={a.business_name} />
          <Row label="Public phone" value={a.public_phone} />
          <Row label="Public email" value={a.public_email} />
          <Row label="Shown on booking page" value={a.show_contact ? "Yes" : "No"} />
        </Card>

        <Card title="Booking setup">
          <Row
            label="Booking page"
            value={bookingUrl ? <a href={bookingUrl} target="_blank" rel="noreferrer" className="text-[#D9467A] hover:underline">/book/{a.slug}</a> : ""}
          />
          <Row label="Days" value={weekdays.length ? weekdays.slice().sort().map((d) => DAYS[d]).join(", ") : ""} />
          <Row
            label="Hours"
            value={typeof a.day_start === "number" && typeof a.day_end === "number" ? `${hour(a.day_start)} – ${hour(a.day_end)}` : ""}
          />
          <Row label="Meeting length" value={a.slot_minutes ? `${a.slot_minutes} min` : ""} />
          <Row label="Books ahead" value={a.days_ahead ? `${a.days_ahead} days` : ""} />
          <Row label="Notice needed" value={a.min_notice_hours != null ? `${a.min_notice_hours} hours` : ""} />
          <Row label="Time zone" value={a.timezone} />
        </Card>

        <Card title="Upcoming bookings">
          <BookingList items={upcoming} empty="Nothing booked ahead." />
        </Card>

        <Card title="Recent bookings">
          <BookingList items={past} empty="No past bookings yet." />
        </Card>

        <Card title="Branding">
          <div className="flex items-center gap-4">
            {a.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.logo_url} alt="" className="h-12 max-w-[140px] object-contain" />
            ) : (
              <span className="text-sm text-[#16151a]/45">No logo</span>
            )}
            {a.headshot_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.headshot_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            )}
          </div>
          {a.tagline && <p className="mt-3 text-sm font-medium text-[#16151a]">{a.tagline}</p>}
          {a.welcome_message && <p className="mt-1 text-sm leading-relaxed text-[#16151a]/60">{a.welcome_message}</p>}
        </Card>
      </div>

      <Card title={`Clients (${clients.length})`} className="mt-4">
        {clients.length === 0 ? (
          <p className="py-2 text-sm text-[#16151a]/45">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-[#16151a]/45">
                <tr>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Phone</th>
                  <th className="py-2 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-[#16151a]/6">
                    <td className="py-2 pr-4 font-medium text-[#16151a]">{`${c.first_name} ${c.last_name}`.trim() || "—"}</td>
                    <td className="py-2 pr-4 text-[#16151a]/65">{c.email || "—"}</td>
                    <td className="py-2 pr-4 text-[#16151a]/65">{c.phone || "—"}</td>
                    <td className="py-2 text-[#16151a]/50">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  )
}
