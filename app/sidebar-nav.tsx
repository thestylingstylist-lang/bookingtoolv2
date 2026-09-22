"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS: { href: string; label: string; soon?: boolean }[] = [
  { href: "/start-here", label: "Start here" },
  { href: "/dashboard", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/templates", label: "Templates" },
  { href: "/bookings", label: "Bookings" },
  { href: "/settings", label: "Settings" },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href

        if (item.soon) {
          return (
            <span
              key={item.href}
              className="flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-sm text-ink/25"
            >
              {item.label}
              <span className="text-[10px] uppercase tracking-wide">Soon</span>
            </span>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "block rounded-lg px-3 py-2 text-sm transition-colors " +
              (active
                ? "bg-ink text-paper"
                : "text-ink/70 hover:bg-ink/5 hover:text-ink")
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
