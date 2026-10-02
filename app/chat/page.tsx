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

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" as const, letterSpacing: "-0.01em" }
const HAND = { fontFamily: "'Caveat', cursive" }

const CSS = `
.vint{--cream:#F4ECDE;--cream-2:rgba(244,236,222,.72);--cream-3:rgba(244,236,222,.5);--edge:rgba(244,236,222,.28)}
.vint,.vint [class~="text-[#16151a]"]{color:var(--cream)!important}
.vint [class~="text-[#5d5b62]"]{color:var(--cream-2)!important}
.vint [class~="text-[#9a989e]"]{color:var(--cream-3)!important}
.vint [class~="disabled:text-[#d6d4d0]"]:disabled{color:rgba(244,236,222,.25)!important}
.vint [class~="text-white"]{color:var(--cream)!important}
.vint [class~="bg-white"]{background:rgba(255,246,232,.06)!important}
.vint [class~="border-[#e6e5e3]"],.vint [class~="border-[#e2e0dc]"]{border-color:var(--edge)!important}
.vint [class~="border-[#16151a]"]{border-color:rgba(244,236,222,.55)!important}
.vint [class~="bg-[#16151a]"]{background:rgba(18,13,9,.62)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.vint [class~="hover:bg-[var(--accent-soft)]"]:hover{background:rgba(255,189,89,.14)!important}
.vint [class~="bg-[#f3f3f3]"]{background:rgba(255,246,232,.1)!important}
.vint [class~="text-[#8a2f25]"]{color:#FFBD59!important}
.vint [role="dialog"]{background:rgba(52,40,29,.94)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.vint svg[stroke="#16151a"]{stroke:var(--cream)}
.vint input::placeholder,.vint textarea::placeholder{color:rgba(244,236,222,.38)!important}
.vint option{color:#16151a}
.vint input[type="date"]{color-scheme:dark}
.vint h2,.vint [style*="-0.02em"]{font-family:'Playfair Display',Georgia,serif!important;font-style:italic;font-weight:400!important;letter-spacing:-.01em!important}
.vint .bf-sub{font-family:'Caveat',cursive!important;font-size:22px!important;color:#FFBD59!important}
.vint .bf-sub svg{stroke:#FFBD59}
`

export default async function ChatPage() {
  const slots = generateSlots(CHAT_CFG, await takenChatSlots())

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Playfair+Display:ital,wght@0,400..700;1,400..700&display=swap"
        precedence="default"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        style={{
          "--accent": "#FFBD59",
          "--accent-soft": "rgba(255,189,89,.16)",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        } as React.CSSProperties}
        className="vint relative isolate min-h-screen text-[#F4ECDE]"
      >
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#2a2016]">
          <img src="/marvberry/chat-bg.webp" alt="" className="h-full w-full object-cover" style={{ objectPosition: "45% 50%" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 60% 40%, rgba(30,22,14,.15), rgba(30,22,14,.55))" }} />
        </div>

        <div className="grid min-h-screen lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside
            className="flex flex-col px-6 pb-10 pt-6 sm:px-8 lg:min-h-screen lg:pt-8"
            style={{ background: "rgba(34,26,18,.86)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          >
            <a href="/" className="mb-6 w-fit text-[11px] uppercase tracking-[3px] text-[rgba(244,236,222,.7)]">
              Marvberry
            </a>
            <div className="overflow-hidden rounded-[18px]">
              <img
                src="/marvberry/alecia-chat.webp"
                alt="Alecia Ford, founder of Marvberry"
                className="h-[380px] w-full object-cover sm:h-[460px]"
                style={{ objectPosition: "50% 22%", filter: "sepia(.18) saturate(.92) contrast(.96)" }}
              />
            </div>
            <p className="mt-7 text-[15px] leading-[1.6] text-[rgba(244,236,222,.82)]">
              When a brand is failing, 80% of the time it&rsquo;s not the product. It&rsquo;s the experience.
            </p>
            <p style={SERIF} className="mt-4 text-[30px] leading-[1.14]">
              Start with your client experience.<br />
              Get that right, and <span style={HAND} className="text-[#FFBD59] not-italic text-[40px] leading-[1]">everything else flows.</span>
            </p>
            <div className="mt-6 border-t border-[rgba(244,236,222,.22)] pt-4">
              <p style={HAND} className="text-[34px] leading-none text-[#F4ECDE]">{CHAT_HOST.name}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[3px] text-[rgba(244,236,222,.65)]">Founder, Marvberry</p>
            </div>
          </aside>

          <main className="flex items-start px-4 py-8 sm:px-10 sm:py-14 lg:items-center lg:px-14">
            <div
              className="mx-auto w-full max-w-[880px] rounded-[22px] border border-[rgba(244,236,222,.28)] px-5 py-7 sm:px-10 sm:py-9"
              style={{
                background: "rgba(92,74,56,.34)",
                backdropFilter: "blur(20px) saturate(1.1)",
                WebkitBackdropFilter: "blur(20px) saturate(1.1)",
                boxShadow: "0 30px 60px -30px rgba(10,6,3,.6), inset 0 1px 0 rgba(255,255,255,.12)",
              }}
            >
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
                askRole
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
              <p className="mt-10 text-xs text-[rgba(244,236,222,.5)]">Your details are only used to schedule and prepare for our chat.</p>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
