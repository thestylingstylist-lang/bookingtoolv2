import Link from "next/link"
import AdminNav from "./admin-nav"
import { signOut } from "@/app/login/actions"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"

// Internal Marvberry team area. Carries the brand (unlike the neutral realtor app).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Unread realtor messages, shown as a badge on Support.
  let unread = 0
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser()
    if (user && isAdminEmail(user.email)) {
      const { count } = await createAdminClient()
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("from_team", false)
        .eq("read_by_team", false)
      unread = count ?? 0
    }
  } catch {}
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F4F3F1] text-[#16151A]">
      {/* brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(40% 50% at 30% 50%, rgba(232,155,180,1), transparent 70%), radial-gradient(35% 45% at 55% 40%, rgba(217,70,122,.35), transparent 70%), radial-gradient(40% 50% at 75% 55%, rgba(251,201,142,1), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <header className="relative flex w-full flex-wrap items-center gap-x-8 gap-y-4 px-6 pt-8 sm:px-10 lg:px-16">
        <Link href="/admin/agents" className="text-lg font-semibold tracking-tight">
          Marvberry
          <span className="ml-2 rounded-full bg-gradient-to-r from-[#D9467A] to-[#EE7C55] px-2.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wider text-white">
            Team
          </span>
        </Link>
        <AdminNav unread={unread} />
        <form action={signOut} className="ml-auto">
          <button className="rounded-full px-3.5 py-1.5 text-sm font-medium text-[#16151a]/60 transition-colors hover:bg-white/70 hover:text-[#16151a]">
            Sign out
          </button>
        </form>
      </header>
      <div className="relative">{children}</div>
    </div>
  )
}
