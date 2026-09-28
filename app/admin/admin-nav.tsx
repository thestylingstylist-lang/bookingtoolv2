"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/feedback", label: "Support" },
]

export default function AdminNav() {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1 text-sm">
      {NAV.map((n) => {
        const on = path?.startsWith(n.href)
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
          </Link>
        )
      })}
    </nav>
  )
}
