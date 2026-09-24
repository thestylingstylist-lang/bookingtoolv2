"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS: { href: string; label: string }[] = [
  { href: "/start-here", label: "Start here" },
  { href: "/dashboard", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/templates", label: "Templates" },
  { href: "/bookings", label: "Bookings" },
  { href: "/settings", label: "Settings" },
]

export default function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={collapsed ? "flex flex-col items-center gap-3" : "space-y-1"}>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")

        if (collapsed) {
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors " +
                (active ? "bg-white text-[#141210]" : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white")
              }
            >
              {item.label.charAt(0)}
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "block rounded-lg px-3 py-2 text-sm transition-colors " +
              (active ? "bg-white text-[#141210]" : "text-white/60 hover:bg-white/10 hover:text-white")
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
