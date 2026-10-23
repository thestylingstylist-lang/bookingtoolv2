import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { PAID_STATUSES, stripe, planForPrice } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
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

  // Which plan they're on, straight from Stripe.
  let current: { name: string; price: string } | null = null
  if (paid) {
    try {
      const { data: c } = await createAdminClient().from("agents").select("stripe_customer_id").eq("id", user.id).maybeSingle()
      const customer = (c as { stripe_customer_id?: string } | null)?.stripe_customer_id
      if (customer) {
        const subs = await stripe().subscriptions.list({ customer, status: "all", limit: 3 })
        const sub = subs.data.find((x) => PAID_STATUSES.includes(x.status))
        current = planForPrice(sub?.items.data[0]?.price.id)
      }
    } catch {}
  }

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <h1 className="font-serif font-semibold tracking-tight text-4xl text-ink">Billing</h1>

        {paid ? (
          <div className="mt-8 rounded-2xl border border-[#e6e5e3] bg-white p-8">
            <p className="text-sm text-[#77757c]">Your plan</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{current ? `${current.name} · ${current.price}/month` : "Marvberry"}</p>
            <p className="mt-3 text-[#4f4d53]">Update your card, see receipts, or cancel anytime.</p>
            <form action={openBillingPortal} className="mt-6">
              <button className="rounded-full bg-[#16151a] px-6 py-3 font-medium text-white hover:bg-[#2e2d33]">
                Manage billing
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8">
            <p className="text-[#4f4d53]">
              {ended ? "Your free trial has ended. Pick a plan to keep everything running." : "Pick a plan to keep everything running after your trial."} Your
              clients, bookings and documents stay right where they are.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <form action={startCheckout} className="flex flex-col rounded-2xl bg-[#16151a] p-7 text-[#eeedeb]">
                <input type="hidden" name="plan" value="agent" />
                <p className="text-sm text-[#d6d4d0]">Agent</p>
                <p className="mt-1 text-4xl font-semibold text-white">
                  $67<span className="text-base font-normal opacity-70"> /month</span>
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed">
                  Booking, agreements signed from the phone, a page for every buyer, offers built and sent in minutes, and
                  support chat.
                </p>
                <button className="mt-6 w-full rounded-full bg-white px-6 py-3 font-medium text-[#16151a] hover:bg-[#f4f3f1]">
                  Continue with Agent
                </button>
              </form>
              <form action={startCheckout} className="flex flex-col rounded-2xl border border-[#e6e5e3] bg-white p-7">
                <input type="hidden" name="plan" value="closer" />
                <p className="text-sm text-[#77757c]">Closer</p>
                <p className="mt-1 text-4xl font-semibold text-ink">
                  $147<span className="text-base font-normal text-[#77757c]"> /month</span>
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-[#4f4d53]">
                  Everything in Agent, plus reminders and reply drafts written in your voice, offer follow-ups and your
                  morning update.
                </p>
                <button className="mt-6 w-full rounded-full bg-[#16151a] px-6 py-3 font-medium text-white hover:bg-[#2e2d33]">
                  Continue with Closer
                </button>
              </form>
            </div>
            <p className="mt-4 text-center text-xs text-[#77757c]">Secure checkout by Stripe. Cancel anytime.</p>
          </div>
        )}
      </main>
    </AppShell>
  )
}
