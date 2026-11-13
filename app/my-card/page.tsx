import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AGENT_SELECT, type AgentRow } from "@/lib/agent"
import AppShell from "@/app/app-shell"
import CardPanel from "@/app/dashboard/card-panel"

export const dynamic = "force-dynamic"

// The agent's card: link, QR code, what it did, who's waiting, and its details.
export default async function MyCardPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data } = await supabase.from("agents").select(AGENT_SELECT).eq("id", user.id).maybeSingle()
  const agent = data as AgentRow | null
  if (!agent) redirect("/login")
  const first = (agent.full_name || "").split(" ")[0]

  return (
    <AppShell agent={agent}>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#16151a]">{sp.new ? `Your card is live${first ? `, ${first}` : ""}` : "Your card"}</h1>
        <p className="mt-2 text-[15px] text-[#55535b]">
          {sp.new ? "Three quick things make it yours." : "Share your link or QR code anywhere. Everyone who books or asks lands here."}
        </p>
        {sp.new && (
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            <li className="rounded-xl bg-white p-4 ring-1 ring-[#efeeec]">
              <p className="text-[13px] text-[#8e8c93]">1</p>
              <a href="/settings" className="mt-1 block text-[15px] font-medium text-[#16151a] underline underline-offset-4">Add your photo and title</a>
            </li>
            <li className="rounded-xl bg-white p-4 ring-1 ring-[#efeeec]">
              <p className="text-[13px] text-[#8e8c93]">2</p>
              <a href="/settings" className="mt-1 block text-[15px] font-medium text-[#16151a] underline underline-offset-4">Set when you’re free to meet</a>
            </li>
            <li className="rounded-xl bg-white p-4 ring-1 ring-[#efeeec]">
              <p className="text-[13px] text-[#8e8c93]">3</p>
              <p className="mt-1 text-[15px] font-medium text-[#16151a]">Add your areas and guide below, under Edit your card</p>
            </li>
          </ol>
        )}
        <CardPanel supabase={supabase} agentId={user.id} slug={agent.slug} />
      </main>
    </AppShell>
  )
}
