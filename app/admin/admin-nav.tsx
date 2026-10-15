"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/messages", label: "Support" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/site", label: "Site" },
]

export default function AdminNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV.map((n) => {
        const on = n.href === "/admin" ? path === "/admin" : path?.startsWith(n.href)
        return (
          <Link
            key={n.href}
            href={n.href}
            className={
              on
                ? "rounded-full bg-[#16151a] px-3.5 py-1.5 font-medium text-white"
                : "rounded-full px-3.5 py-1.5 font-medium text-[#16151a]/60 transition-colors hover:bg-white/70 hover:text-[#16151a]"
            }
          >
            {n.label}
            {n.href === "/admin/messages" && unread > 0 && (
              <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#D9467A] px-1.5 text-[11px] font-semibold leading-[18px] text-white">
                {unread}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
