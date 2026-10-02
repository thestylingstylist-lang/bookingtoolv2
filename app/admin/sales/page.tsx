import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { addLead } from "./actions"
import type { Stage } from "./stages"
import LeadRow from "./lead-row"

export const dynamic = "force-dynamic"

type Lead = {
  id: string; name: string; email: string | null; phone: string | null
  source: string | null; stage: Stage; next_step: string | null; notes: string | null
  call_at: string | null; created_at: string
}

export default async function AdminSalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sales_leads")
    .select("id, name, email, phone, source, stage, next_step, notes, call_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  const leads = (data ?? []) as Lead[]
  const total = leads.length
  const called = leads.filter((l) => l.stage === "called" || l.stage === "member" || l.stage === "lost").length
  const members = leads.filter((l) => l.stage === "member").length
  const booked = leads.filter((l) => l.stage === "call_booked").length
  const convFromCalls = called > 0 ? Math.round((members / called) * 100) : 0

  const stat = (label: string, value: string) => (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur-xl shadow-[0_1px_0_rgba(22,21,26,0.04),0_8px_24px_-12px_rgba(217,70,122,0.25)]">
      <p className="text-3xl font-semibold tracking-tight text-[#16151a]">{value}</p>
      <p className="mt-1 text-xs font-medium text-[#16151a]/55">{label}</p>
    </div>
  )

  return (
    <main className="w-full px-6 pb-16 pt-10 sm:px-10 lg:px-16">
      <p className="text-sm font-semibold tracking-wide text-[#D9467A]">Sales</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#16151a]">
        Who&apos;s <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text font-serif italic text-transparent">coming in</em>
      </h1>

      {error && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The sales table isn&apos;t set up yet. Run supabase/sales-leads.sql in Supabase, then refresh.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stat("Leads", String(total))}
        {stat("Calls booked", String(booked))}
        {stat("Members", String(members))}
        {stat("Conversion from calls", convFromCalls + "%")}
      </div>

      <form action={addLead} className="mt-10 flex flex-wrap items-end gap-3 rounded-2xl border border-white/80 bg-white/60 p-5 backdrop-blur-xl">
        <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
          Name
          <input name="name" required className="rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
          Email
          <input name="email" type="email" className="rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
          Phone
          <input name="phone" className="rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-[#16151a]/60">
          Source
          <input name="source" placeholder="event, referral…" className="rounded-lg border border-[#16151a]/15 bg-white px-3 py-1.5 text-sm text-[#16151a]" />
        </label>
        <button className="rounded-full bg-[#16151a] px-5 py-2 text-sm font-medium text-white">Add lead</button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/80 bg-white/70 p-1 backdrop-blur-xl">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-[#16151a]/40">
              <th className="px-3 py-2.5 w-[1%] whitespace-nowrap">Lead</th>
              <th className="px-3 py-2.5 w-[1%] whitespace-nowrap">Source</th>
              <th className="px-3 py-2.5 w-[1%] whitespace-nowrap">Stage</th>
              <th className="px-3 py-2.5 w-[1%] whitespace-nowrap">Call</th>
              <th className="px-3 py-2.5">Next step</th>
              <th className="px-3 py-2.5">Notes</th>
              <th className="px-3 py-2.5 w-[1%] whitespace-nowrap">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16151a]/5 px-4">
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#16151a]/45">No leads yet.</td></tr>
            )}
            {leads.map((l) => (
              <LeadRow
                key={l.id} id={l.id} name={l.name} email={l.email} phone={l.phone}
                source={l.source} stage={l.stage} nextStep={l.next_step}
                notes={l.notes}
                callAt={l.call_at} createdAt={l.created_at}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
