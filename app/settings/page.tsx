import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import SettingsForm from "./settings-form"
import AccountForm from "./account-form"
import AgreementForm from "./agreement-form"
import AssistantForm from "./assistant-form"
import { assistantFor } from "@/lib/assistant"
import { toAgreementSettings } from "@/lib/agreement"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "company" ? "company" : "account"
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

  // Same idea for the license number: blank until its column exists.
  const { data: licenseRow } = await supabase.from("agents").select("license_number").eq("id", user.id).maybeSingle()
  const license = (licenseRow as { license_number?: string } | null)?.license_number ?? ""
  const { data: linkRow } = await supabase.from("agents").select("meeting_link").eq("id", user.id).maybeSingle()
  const meetingLink = (linkRow as { meeting_link?: string } | null)?.meeting_link ?? ""
  const { data: sigRow } = await supabase.from("agents").select("signature_photo").eq("id", user.id).maybeSingle()
  const signaturePhoto = !!(sigRow as { signature_photo?: boolean } | null)?.signature_photo

  const assistant = await assistantFor(supabase, user.id)

  // Split the stored full name into first / last for the account fields.
  const parts = (agent.full_name || "").trim().split(/\s+/).filter(Boolean)
  const firstName = parts.length ? parts[0] : ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : ""

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <h1 className="font-serif font-semibold tracking-tight text-3xl">Settings</h1>

        <nav className="mt-6 flex gap-7 border-b border-ink/10 text-[15px]">
          {[
            ["account", "Account"],
            ["company", "Company"],
          ].map(([k, l]) => (
            <a
              key={k}
              href={`/settings?tab=${k}`}
              className={`-mb-px border-b-2 pb-3 ${tab === k ? "border-ink font-semibold text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}
            >
              {l}
            </a>
          ))}
        </nav>

        {tab === "account" ? (
          <div className="mt-8 max-w-2xl space-y-6">
            <section className="rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">You</h2>
              <p className="mt-1 text-sm text-ink/60">Your name, login email and password. Only you and the Marvberry team see this.</p>
              <div className="mt-6">
                <AccountForm firstName={firstName} lastName={lastName} email={user.email ?? ""} />
              </div>
            </section>
            <section id="assistant" className="rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">Marvberry Assistant</h2>
              <p className="mt-1 text-sm text-ink/60">Your assistant writes to your clients in your voice. Your clients only ever see your name.</p>
              <div className="mt-6">
                <AssistantForm unlocked={assistant.unlocked} auto={assistant.auto} voice={assistant.voice} />
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-8 max-w-2xl space-y-6">
            <SettingsForm
              agent={agent}
              license={license}
              meetingLink={meetingLink}
              signaturePhoto={signaturePhoto}
              bookingLink={
                <div className="rounded-xl bg-ink/[0.03] p-4">
                  <p className="text-sm text-ink/60">Your booking link. Share it with clients:</p>
                  <BookingLink slug={agent.slug} />
                </div>
              }
            />
            <section className="rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
              <h2 className="font-serif font-semibold tracking-tight text-xl">Deals</h2>
              <p className="mt-1 text-sm text-ink/60">Set this once. Every agreement you send fills it in, so the only thing left is the commission.</p>
              <div className="mt-6">
                <AgreementForm initial={agreement} commission={commission} />
              </div>
            </section>
            <section className="rounded-2xl border border-ink/10 bg-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif font-semibold tracking-tight text-xl">Billing</h2>
                <p className="mt-1 text-sm text-ink/60">Your plan and your payment card.</p>
              </div>
              <a href="/billing" className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium hover:bg-ink/[0.03]">Open billing</a>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  )
}
