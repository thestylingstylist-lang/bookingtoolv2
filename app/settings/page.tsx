import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import SettingsForm from "./settings-form"
import AccountForm from "./account-form"
import AgreementForm from "./agreement-form"
import { toAgreementSettings } from "@/lib/agreement"
import BookingLink from "../booking-link"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
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

  // Same idea for the license number: blank until its column exists.
  const { data: licenseRow } = await supabase.from("agents").select("license_number").eq("id", user.id).maybeSingle()
  const license = (licenseRow as { license_number?: string } | null)?.license_number ?? ""

  // Split the stored full name into first / last for the account fields.
  const parts = (agent.full_name || "").trim().split(/\s+/).filter(Boolean)
  const firstName = parts.length ? parts[0] : ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : ""

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <p className="text-sm font-medium tracking-wide text-sage">Settings</p>
        <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">Your booking page</h1>

        {/* Two halves on desktop; they stack on mobile (booking page first). */}
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* LEFT — booking page / brand */}
          <section className="min-w-0">
            <h2 className="font-serif font-semibold tracking-tight text-2xl">Your booking page</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
              This controls how your booking page appears to your clients on the
              front end. Go ahead and customize it so it feels more aligned to
              your brand.
            </p>

            <div className="mb-8 mt-6 rounded-2xl border border-ink/10 bg-card p-5">
              <p className="text-sm text-ink/60">
                Your booking link &mdash; share this with clients:
              </p>
              <BookingLink slug={agent.slug} />
            </div>

            <SettingsForm agent={agent} license={license} />
          </section>

          {/* RIGHT — account */}
          <section className="min-w-0">
            <h2 className="font-serif font-semibold tracking-tight text-2xl">Your account</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
              This is all of your account information. No one sees this.
              It&rsquo;s what we use to identify you when you reach out for
              customer service, and to set up your account with Marvberry.
            </p>

            <div className="mt-6">
              <AccountForm
                firstName={firstName}
                lastName={lastName}
                email={user.email ?? ""}
              />
            </div>

            <h2 className="mt-14 font-serif font-semibold tracking-tight text-2xl">Your agreements</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
              Set this once. Every agreement you send fills it in, so the only thing left
              is the commission.
            </p>
            <div className="mt-6">
              <AgreementForm initial={agreement} />
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
