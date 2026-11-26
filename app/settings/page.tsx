import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import SettingsForm from "./settings-form"
import AccountForm from "./account-form"
import AgreementForm from "./agreement-form"
import AssistantForm from "./assistant-form"
import NotifyForm from "./notify-form"
import MeetingForm from "./meeting-form"
import DianaMemoryForm from "./diana-memory-form"
import { memories as loadMemories } from "@/lib/diana-memory"
import { loadAssistantName } from "@/lib/assistant-name"
import { assistantFor } from "@/lib/assistant"
import { aiPrefsFor } from "@/lib/ai-prefs"
import { toAgreementSettings } from "@/lib/agreement"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; section?: string }> }) {
  const sp = await searchParams
  // Marvberry AI lives under Company. Old links to /settings?tab=ai or #assistant still land there.
  const tab = sp.tab === "company" || sp.tab === "ai" ? "company" : "account"
  const section = sp.tab === "ai" || sp.section === "ai" ? "ai" : "brand"
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data } = await supabase
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", user.id)
    .maybeSingle()

  const agent = data as AgentRow | null
  if (!agent) redirect("/login")
  const assistantName = await loadAssistantName(supabase, user.id)

  // Agreement defaults live in their own columns; if they're not there yet,
  // the defaults (90 days, exclusive) show instead of breaking the page.
  const { data: agreementRow } = await supabase
    .from("agents")
    .select("agreement_days, agreement_exclusive")
    .eq("id", user.id)
    .maybeSingle()
  const agreement = toAgreementSettings(agreementRow)
  const { data: commissionRow } = await supabase.from("agents").select("default_commission").eq("id", user.id).maybeSingle()
  const commission = (commissionRow as { default_commission?: string } | null)?.default_commission ?? ""
  // Read on its own, so Settings still opens before the broker columns exist.
  const { data: brokerRow } = await supabase.from("agents").select("broker_name, broker_email").eq("id", user.id).maybeSingle()
  const broker = {
    name: ((brokerRow as { broker_name?: string } | null)?.broker_name ?? "").trim(),
    email: ((brokerRow as { broker_email?: string } | null)?.broker_email ?? "").trim(),
  }

  // Same idea for the license number: blank until its column exists.
  const { data: licenseRow } = await supabase.from("agents").select("license_number").eq("id", user.id).maybeSingle()
  const license = (licenseRow as { license_number?: string } | null)?.license_number ?? ""
  const { data: linkRow } = await supabase.from("agents").select("meeting_link").eq("id", user.id).maybeSingle()
  const meetingLink = (linkRow as { meeting_link?: string } | null)?.meeting_link ?? ""
  const { data: sigRow } = await supabase.from("agents").select("signature_photo").eq("id", user.id).maybeSingle()
  const signaturePhoto = !!(sigRow as { signature_photo?: boolean } | null)?.signature_photo

  // Notification switches: on by default until her own choices are saved.
  const { data: nRow } = await supabase
    .from("agents")
    .select("notify_messages, notify_signed, notify_bookings, notify_support, notify_hours_only")
    .eq("id", user.id)
    .maybeSingle()
  const n = (nRow ?? {}) as Record<string, boolean | undefined>
  const notifyPrefs = {
    messages: n.notify_messages ?? true,
    signed: n.notify_signed ?? true,
    bookings: n.notify_bookings ?? true,
    support: n.notify_support ?? true,
    hoursOnly: n.notify_hours_only ?? false,
  }
  const hoursLabel = hoursSaid(agent.weekdays, agent.day_start, agent.day_end)

  const { data: lenRow } = await supabase.from("agents").select("meeting_call_minutes, meeting_inperson_minutes").eq("id", user.id).maybeSingle()
  const { data: sbRow } = await supabase.from("agents").select("show_brokerage").eq("id", user.id).maybeSingle()
  const showBrokerage = (sbRow?.show_brokerage as boolean | undefined) ?? true
  const { data: keepRow } = await supabase.from("agents").select("assistant_keep").eq("id", user.id).maybeSingle()
  const keepChats = (keepRow?.assistant_keep as boolean | undefined) ?? true
  const dianaNotes = await loadMemories(supabase, user.id).catch(() => [])
  const meetLens = { call: lenRow?.meeting_call_minutes ?? 30, inPerson: lenRow?.meeting_inperson_minutes ?? 60 }

  const assistant = await assistantFor(supabase, user.id)
  const aiPrefs = await aiPrefsFor(supabase, user.id)

  // Split the stored full name into first / last for the account fields.
  const parts = (agent.full_name || "").trim().split(/\s+/).filter(Boolean)
  const firstName = parts.length ? parts[0] : ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : ""

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <h1 className="font-serif font-semibold tracking-tight text-3xl">Settings</h1>

        <nav className="mt-6 flex gap-7 border-b border-lxink/10 text-[15px]">
          {[
            ["account", "Account"],
            ["company", "Company"],
          ].map(([k, l]) => (
            <a
              key={k}
              href={`/settings?tab=${k}`}
              className={`-mb-px border-b-2 pb-3 ${tab === k ? "border-lxink font-semibold text-lxink" : "border-transparent text-lxink/50 hover:text-lxink"}`}
            >
              {l}
            </a>
          ))}
        </nav>

        {tab === "account" ? (
          <div className="mt-8 max-w-2xl space-y-6">
            <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">You</h2>
              <p className="mt-1 text-sm text-lxink/60">Your name, login email and password. Only you and the Marvberry team see this.</p>
              <div className="mt-6">
                <AccountForm firstName={firstName} lastName={lastName} email={user.email ?? ""} />
              </div>
            </section>
<section id="notifications" className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">Notifications</h2>
              <p className="mt-1 text-sm text-lxink/60">A quiet heads-up on this device. Anything you leave off still comes by email.</p>
              <div className="mt-4">
                <NotifyForm prefs={notifyPrefs} hoursLabel={hoursLabel} />
              </div>
            </section>
<section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif font-semibold tracking-tight text-xl">Billing</h2>
                <p className="mt-1 text-sm text-lxink/60">Your plan, your card, and how to cancel.</p>
              </div>
              <a href="/billing" className="rounded-full border border-lxink/15 px-5 py-2.5 text-sm font-medium hover:bg-lxink/[0.03]">Open billing</a>
            </section>

          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[200px_minmax(0,42rem)] lg:gap-10">
            <nav className="flex gap-2 lg:flex-col lg:gap-1">
              {[
                ["brand", "Company brand"],
                ["ai", assistantName],
              ].map(([k, l]) => (
                <a
                  key={k}
                  href={`/settings?tab=company&section=${k}`}
                  className={`rounded-full px-4 py-2 text-[15px] lg:rounded-xl ${
                    section === k ? "bg-lxink/[0.06] font-semibold text-lxink" : "text-lxink/55 hover:text-lxink"
                  }`}
                >
                  {l}
                </a>
              ))}
            </nav>
            {section === "ai" ? (
          <div className="space-y-6">
            <section id="assistant" className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">{assistantName}</h2>
              <p className="mt-1 text-sm text-lxink/60">Turn on what you&rsquo;d like {assistantName} to help with. Anything she writes goes out in your name.</p>
              <div className="mt-6">
                <AssistantForm unlocked={assistant.unlocked} auto={assistant.auto} voice={assistant.voice} prefs={aiPrefs} />
                <MeetingForm call={meetLens.call} inPerson={meetLens.inPerson} name={assistantName} />
                <DianaMemoryForm name={assistantName} keep={keepChats} notes={dianaNotes.map((m) => ({ id: m.id, body: m.body, client_name: m.client_name }))} />
              </div>
            </section>
          </div>
            ) : (
          <div className="space-y-6">
            <SettingsForm
              agent={agent}
              showBrokerage={showBrokerage}
              license={license}
              meetingLink={meetingLink}
              signaturePhoto={signaturePhoto}
              bookingLink={
                <div className="rounded-xl bg-lxink/[0.03] p-4">
                  <p className="text-sm text-lxink/60">Your booking link. Share it with clients:</p>
                  <BookingLink slug={agent.slug} />
                </div>
              }
            />
            <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">Deals</h2>
              <p className="mt-1 text-sm text-lxink/60">Set this once. Every agreement you send fills it in, so the only thing left is the commission.</p>
              <div className="mt-6">
                <AgreementForm initial={agreement} commission={commission} broker={broker} />
              </div>
            </section>

          </div>
            )}
          </div>
        )}
      </main>
    </AppShell>
  )
}

const DAY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function clock(h: number) {
  const hr = Math.floor(h)
  const min = Math.round((h - hr) * 60)
  const ampm = hr >= 12 && hr < 24 ? "PM" : "AM"
  const twelve = hr % 12 === 0 ? 12 : hr % 12
  return `${twelve}:${String(min).padStart(2, "0")} ${ampm}`
}

// "Monday to Friday, 9:00 AM to 5:00 PM"
function hoursSaid(weekdays: number[] | null | undefined, start: number | null | undefined, end: number | null | undefined) {
  const days = [...(weekdays?.length ? weekdays : [1, 2, 3, 4, 5])].sort((a, b) => a - b)
  const run = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  const dayText =
    days.length === 7 ? "Every day" : run && days.length > 2 ? `${DAY[days[0]]} to ${DAY[days[days.length - 1]]}` : days.map((d) => DAY[d]).join(", ")
  return `${dayText}, ${clock(start ?? 9)} to ${clock(end ?? 17)}`
}
