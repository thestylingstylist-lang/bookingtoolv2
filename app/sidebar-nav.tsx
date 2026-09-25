"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Thin line icons, 24px grid, drawn with the current text color
const ICONS: Record<string, React.ReactNode> = {
  // lightbulb
  "/start-here": (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.1V17h5v-1.1c0-.8.5-1.6 1.1-2.1A6 6 0 0 0 12 3z" />
    </>
  ),
  // house
  "/dashboard": (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v12h14V9" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  // people
  "/clients": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7" />
    </>
  ),
  // document
  "/templates": (
    <>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  // calendar
  "/bookings": (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  // gear
  "/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
}

function Icon({ href, size = 20 }: { href: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {ICONS[href]}
    </svg>
  )
}

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
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors " +
                (active ? "bg-white text-[#141210]" : "text-white/60 hover:bg-white/10 hover:text-white")
              }
            >
              <Icon href={item.href} />
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
              (active ? "bg-white text-[#141210]" : "text-white/60 hover:bg-white/10 hover:text-white")
            }
          >
            <Icon href={item.href} size={18} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
