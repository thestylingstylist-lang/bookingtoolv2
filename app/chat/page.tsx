import type { Metadata } from "next"
import { generateSlots } from "@/lib/slots"
import BookingForm from "@/app/book/[slug]/booking-form"
import { bookChat } from "./actions"
import { CHAT_CFG, CHAT_HOST, CHAT_EVENT_TITLE } from "./config"
import { takenChatSlots } from "./taken"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Book a chat with Marvberry" },
  description: "Thirty minutes. No card. See how Marvberry runs your deals.",
  alternates: { canonical: "/chat" },
}

const THEME = {
  "--base": "#F4F3F1",
  "--panel": "#ECEAE7",
  "--photo": "#E3E0DC",
  "--panel-line": "#E3E0DC",
  "--accent": "#D9467A",
  "--accent-soft": "#FBE3EB",
} as React.CSSProperties

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.015em" }

export default async function ChatPage() {
  const slots = generateSlots(CHAT_CFG, await takenChatSlots())

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&display=swap"
        precedence="default"
      />
      <div
        style={{ ...THEME, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
        className="grid min-h-screen bg-[var(--base)] text-[#16151a] lg:grid-cols-[480px_minmax(0,1fr)]"
      >
        <aside className="relative min-h-[560px] overflow-hidden bg-[var(--panel)] lg:min-h-screen">
          <img
            src="/marvberry/alecia-chat.webp"
            alt="Alecia Ford, founder of Marvberry"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "50% 22%" }}
          />
          <a
            href="/"
            className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-[16px] font-semibold tracking-tight backdrop-blur-xl sm:left-8 sm:top-8"
          >
            <span
              aria-hidden
              className="inline-block h-5 w-5"
              style={{ borderRadius: "50% 50% 50% 8%", background: "linear-gradient(135deg,#E89BB4,#FBC98E)" }}
            />
            Marvberry
          </a>
          <div
            className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-white/70 px-6 py-5 sm:bottom-6 sm:left-6 sm:right-6"
            style={{
              background: "rgba(255,255,255,.55)",
              backdropFilter: "blur(22px) saturate(1.3)",
              WebkitBackdropFilter: "blur(22px) saturate(1.3)",
              boxShadow: "0 20px 40px -20px rgba(22,21,26,.35)",
            }}
          >
            <p style={SERIF} className="text-[30px] font-medium leading-[1.1] sm:text-[34px]">
              30 minutes. No card.<br />
              <em className="italic text-[var(--accent)]">No homework.</em>
            </p>
            <div className="mt-4 border-t border-[rgba(22,21,26,.12)] pt-3">
              <p className="text-[17px] font-medium tracking-tight">{CHAT_HOST.name}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[2px] text-[#5d5b62]">Founder, Marvberry</p>
            </div>
          </div>
        </aside>

        <main className="bg-white px-5 py-10 sm:px-14 sm:py-14 lg:pr-[72px]">
          <div className="mx-auto max-w-[860px]">
            <BookingForm
              slots={slots}
              slug="chat"
              agent={{
                name: CHAT_HOST.name,
                minutes: CHAT_CFG.slotMinutes,
                email: CHAT_HOST.email,
                timezone: CHAT_CFG.timezone,
              }}
              submit={bookChat}
              askLookingTo={false}
              solidPick
              icsPath="/chat/ics"
              copy={{
                title: "Book your setup",
                button: "Book my chat",
                withWho: "Your chat with Alecia",
                eventTitle: CHAT_EVENT_TITLE,
                steps: [
                  "A confirmation is on its way to your email.",
                  "Bring your questions, and whatever you\u2019re juggling right now.",
                  "I\u2019ll show you how it works. If it fits, I\u2019ll set it up for you.",
                ],
              }}
            />
            <p className="mt-14 text-xs text-[#9a989e]">Your details are only used to schedule and prepare for our chat.</p>
          </div>
        </main>
      </div>
    </>
  )
}
