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
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
      <p className="text-sm font-medium tracking-wide text-lxgold">Start here</p>
      <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">
        {complete ? "You\u2019re all set." : "Let\u2019s get you set up."}
      </h1>
      <p className="mt-2 text-lxink/60">
        {complete
          ? "Your booking page is ready to share. You can change anything later in Settings."
          : "A few quick steps to get your booking page ready for clients."}
      </p>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm text-lxink/60">
          <span>
            {done} of {total} done
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-lxink/10">
          <div
            className="h-full rounded-full bg-lxgold transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="mt-8 space-y-3">
        {SETUP_STEPS.map((step) => {
          const isDone = step.done(signals)
          // Only the first open step gets the dark button.
          const isNext = SETUP_STEPS.find((x) => !x.done(signals)) === step
          return (
            <li
              key={step.key}
              className={
                "flex items-start gap-4 rounded-2xl border p-5 " +
                (isDone
                  ? "border-lxgold/30 bg-lxgold/5"
                  : "border-lxink/10 bg-card")
              }
            >
              <span
                className={
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm " +
                  (isDone ? "bg-lxgold text-lxbg" : "border border-lxink/20 text-lxink/30")
                }
              >
                {isDone ? "\u2713" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className={"font-medium " + (isDone ? "text-lxink/50 line-through" : "")}>
                  {step.title}
                </p>
                {!isDone && (
                  <p className="mt-1 text-sm text-lxink/60">{step.detail}</p>
                )}
              </div>
              {!isDone && (
                <Link
                  href={step.href}
                  className={`shrink-0 rounded-[2px] px-4 py-2 text-sm ${isNext ? "bg-lxink text-lxbg hover:opacity-90" : "border border-lxink bg-transparent text-lxink hover:bg-lxink/[0.04]"}`}
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
