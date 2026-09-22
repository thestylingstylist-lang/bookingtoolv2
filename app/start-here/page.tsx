import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import { SETUP_STEPS, setupProgress } from "@/lib/onboarding"
import AppShell from "@/app/app-shell"

export const dynamic = "force-dynamic"

export default async function StartHerePage() {
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

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })

  const signals = { agent, bookingCount: count ?? 0 }
  const { done, total, complete } = setupProgress(SETUP_STEPS, signals)
  const pct = Math.round((done / total) * 100)

  return (
    <AppShell agent={agent}>
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium tracking-wide text-sage">Start here</p>
      <h1 className="mt-2 font-serif text-3xl">
        {complete ? "You\u2019re all set." : "Let\u2019s get you set up."}
      </h1>
      <p className="mt-2 text-ink/60">
        {complete
          ? "Your page is ready to share. You can always fine-tune things in Settings."
          : "A few quick steps to get your booking page ready for clients."}
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>
            {done} of {total} done
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-sage transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="mt-8 space-y-3">
        {SETUP_STEPS.map((step) => {
          const isDone = step.done(signals)
          return (
            <li
              key={step.key}
              className={
                "flex items-start gap-4 rounded-2xl border p-5 " +
                (isDone
                  ? "border-sage/30 bg-sage/5"
                  : "border-ink/10 bg-white/50")
              }
            >
              <span
                className={
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm " +
                  (isDone ? "bg-sage text-paper" : "border border-ink/20 text-ink/30")
                }
              >
                {isDone ? "\u2713" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className={"font-medium " + (isDone ? "text-ink/50 line-through" : "")}>
                  {step.title}
                </p>
                {!isDone && (
                  <p className="mt-1 text-sm text-ink/60">{step.detail}</p>
                )}
              </div>
              {!isDone && (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm text-paper hover:opacity-90"
                >
                  {step.cta}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </main>
    </AppShell>
  )
}
