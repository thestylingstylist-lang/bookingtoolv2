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
        <aside className="relative flex flex-col overflow-hidden bg-[var(--panel)] p-8 sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[520px] blur-3xl"
            style={{
              background:
                "radial-gradient(45% 50% at 30% 40%, rgba(232,155,180,.55), transparent 70%), radial-gradient(40% 45% at 72% 55%, rgba(251,201,142,.6), transparent 70%)",
            }}
          />
          <a href="/" className="relative flex items-center gap-2 text-[20px] font-semibold tracking-tight">
            <span
              aria-hidden
              className="inline-block h-6 w-6"
              style={{ borderRadius: "50% 50% 50% 8%", background: "linear-gradient(135deg,#E89BB4,#FBC98E)" }}
            />
            Marvberry
          </a>

          <div className="relative mt-16 flex flex-col gap-5 lg:mt-auto lg:pb-10">
            <h1 style={SERIF} className="text-[48px] font-medium leading-[1.02] sm:text-[60px]">
              Let&rsquo;s{" "}
              <em
                className="italic"
                style={{
                  background: "linear-gradient(100deg,#D9467A 10%,#EE7C55 95%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  paddingRight: "0.08em",
                }}
              >
                talk.
              </em>
            </h1>
            <p className="max-w-[24rem] text-[17px] leading-relaxed text-[#5d5b62]">
              Thirty minutes. No card. No homework. I&rsquo;ll show you how Marvberry runs your deals, and you decide if it fits.
            </p>
            <div className="h-px bg-[var(--panel-line)]" />
            <div className="flex flex-col gap-2">
              <p style={SERIF} className="text-[28px] leading-none">{CHAT_HOST.name}</p>
              <p className="text-xs uppercase tracking-[2px] text-[#5d5b62]">Founder, Marvberry</p>
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
              icsPath="/chat/ics"
              copy={{
                title: "A chat with Alecia",
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
