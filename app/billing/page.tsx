import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { PAID_STATUSES } from "@/lib/stripe"
import AppShell from "@/app/app-shell"
import { startCheckout, openBillingPortal } from "./actions"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await supabase.from("agents").select(AGENT_SELECT).eq("id", user.id).maybeSingle()
  const agent = data as AgentRow | null
  if (!agent) redirect("/login")

  const paid = PAID_STATUSES.includes(agent.subscription_status ?? "")
  const ended = !!agent.trial_ends_at && new Date(agent.trial_ends_at).getTime() <= Date.now()

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-xl px-6 py-12 sm:px-10">
        <h1 className="font-serif text-4xl text-ink">Billing</h1>

        {paid ? (
          <div className="mt-8 rounded-2xl border border-[#ede3da] bg-white p-8">
            <p className="text-sm text-[#94807b]">Your plan</p>
            <p className="mt-1 text-2xl font-semibold text-ink">Solo Agent · $39/month</p>
            <p className="mt-3 text-[#5a4a46]">Update your card, see receipts, or cancel anytime.</p>
            <form action={openBillingPortal} className="mt-6">
              <button className="rounded-full bg-[#5c0a17] px-6 py-3 font-medium text-white hover:bg-[#8a1a2c]">
                Manage billing
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-[#1c1012] p-8 text-[#e9dad5]">
            <p className="text-sm text-[#e9b8ae]">
              {ended ? "Your free trial has ended." : "Keep everything running after your trial."}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">Solo Agent</p>
            <p className="mt-1 text-4xl font-semibold text-white">
              $39<span className="text-base font-normal opacity-70"> /month</span>
            </p>
            <p className="mt-4">
              Every feature. Your clients, bookings, and documents stay right where they are. Cancel anytime.
            </p>
            <form action={startCheckout} className="mt-6">
              <button className="w-full rounded-full bg-white px-6 py-3 font-medium text-[#1c1012] hover:bg-[#f6f0ea]">
                Continue with Solo Agent
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-[#94807b]">Secure checkout by Stripe.</p>
          </div>
        )}
      </main>
    </AppShell>
  )
}
