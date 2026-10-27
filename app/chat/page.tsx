import type { Metadata } from "next"
import { generateSlots } from "@/lib/slots"
import { createClient } from "@/lib/supabase/server"
import BookingForm from "@/app/book/[slug]/booking-form"
import { bookChat } from "./actions"
import { CHAT_CFG, CHAT_HOST, CHAT_EVENT_TITLE } from "./config"
import { takenChatSlots } from "./taken"
import AdPixels from "@/app/ad-pixels"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Book your setup call with Marvberry" },
  description: "Thirty minutes. We set up Marvberry with you, so it's running from day one.",
  alternates: { canonical: "/chat" },
}

// Marvberry's own setup-call page, in the Marvberry look (the home page's font, berry and glow).
// Agents' booking pages for their clients stay neutral, so they feel like the agent's own.
// Right after signup (?welcome=1) it's step two of two, with the agent's details filled in.
export default async function ChatPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const welcome = (await searchParams).welcome === "1"
  const slots = generateSlots(CHAT_CFG, await takenChatSlots())

  // A signed-in agent doesn't retype what they just gave us.
  let prefill: { firstName?: string; lastName?: string; email?: string; phone?: string; role?: string } | undefined
  let first = ""
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: a } = await supabase.from("agents").select("full_name, public_phone").eq("id", user.id).maybeSingle()
      const parts = String(a?.full_name ?? "").trim().split(/\s+/).filter(Boolean)
      first = parts[0] ?? ""
      prefill = {
        firstName: first,
        lastName: parts.slice(1).join(" "),
        email: user.email ?? "",
        phone: String(a?.public_phone ?? ""),
        role: "Solo agent",
      }
    }
  } catch {}

  return (
    <div className="mbchat" style={{ "--accent": "#BC559E", "--accent-soft": "#FBEDF5" } as React.CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div aria-hidden className="glow" />
      <AdPixels event={welcome ? "signup" : undefined} />

      <header className="top">
        <a href="/">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={125} height={24} style={{ height: 24, width: "auto" }} />
        </a>
        {welcome && (
          <ol className="track" aria-label="Your progress">
            <li className="done">Account created</li>
            <li className="now">Book your setup call</li>
          </ol>
        )}
      </header>

      <div className="cols">
        <aside className="host">
          <div className="photo">
            <img src="/marvberry/alecia-chat.webp" alt="Alecia Ford, founder of Marvberry" />
          </div>
          <p className="quote">When a brand is failing, 80% of the time it&rsquo;s not the product. It&rsquo;s the experience.</p>
          <p className="big">
            Start with your client experience. Get that right, and <span className="grad">everything else flows.</span>
          </p>
          <div className="sig">
            <p className="name">{CHAT_HOST.name}</p>
            <p className="role">Founder, Marvberry</p>
          </div>
        </aside>

        <main className="main">
          {welcome && (
            <div className="welcome">
              <img src="/brand/berry.webp" alt="" className="wberry" />
              <div>
                <p className="w1">You&rsquo;re in{first ? `, ${first}` : ""}. One more step.</p>
                <p className="w2">
                  Pick a time for your free setup call. We&rsquo;ll build your booking page, your agreements and your client
                  steps with you, so Marvberry is running from day one.
                </p>
              </div>
            </div>
          )}
          <div className="card">
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
              prefill={prefill}
              icsPath="/chat/ics"
              copy={{
                title: "Book your setup call",
                button: "Book my setup call",
                withWho: "Your setup call with Alecia",
                eventTitle: CHAT_EVENT_TITLE,
                steps: [
                  "A confirmation is on its way to your email.",
                  "Bring your agreements and anything you’re juggling right now.",
                  "We’ll set up Marvberry with you, so it’s ready for your next client.",
                ],
              }}
            />
            <p className="fine">Your details are only used to schedule and prepare for our call.</p>
          </div>
          {welcome && (
            <p className="later">
              Can&rsquo;t pick a time right now? <a href="/dashboard">Go to your dashboard</a>. You can book it from there.
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

const CSS = `
.mbchat{position:relative;isolation:isolate;min-height:100vh;background:#fff;color:#16151a;overflow-x:clip;
  font-family:var(--font-geist-sans),-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.mbchat *{box-sizing:border-box}
.mbchat .glow{position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(45% 40% at 12% 18%,#ffe3ef,transparent 70%),radial-gradient(40% 40% at 88% 12%,#ffe8d8,transparent 70%),radial-gradient(45% 45% at 70% 85%,#ece6ff,transparent 70%)}
.mbchat .top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:20px clamp(16px,5vw,56px)}
.mbchat .track{list-style:none;margin:0;padding:0;display:flex;gap:20px;font-size:13.5px;font-weight:500;color:#8d8b92}
.mbchat .track li{display:flex;align-items:center;gap:8px}
.mbchat .track li::before{content:"";width:20px;height:20px;border-radius:50%;border:1.5px solid #d6d4d0;display:grid;place-items:center;font-size:11px}
.mbchat .track li.done::before{content:"\\2713";background:#BC559E;border-color:#BC559E;color:#fff}
.mbchat .track li.now{color:#16151a}
.mbchat .track li.now::before{border-color:#BC559E;box-shadow:inset 0 0 0 4px #fff;background:#BC559E}
.mbchat .cols{display:grid;grid-template-columns:300px minmax(0,1fr);gap:clamp(24px,3vw,48px);max-width:1440px;margin:0 auto;padding:12px clamp(16px,5vw,56px) 64px;align-items:start}
.mbchat .host{position:sticky;top:24px}
.mbchat .photo{border-radius:24px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(22,21,26,.35)}
.mbchat .photo img{display:block;width:100%;height:380px;object-fit:cover;object-position:50% 22%}
.mbchat .quote{margin:24px 0 0;font-size:15px;line-height:1.6;color:#55535b}
.mbchat .big{margin:12px 0 0;font-size:26px;line-height:1.18;letter-spacing:-.03em;font-weight:620}
.mbchat .grad{background:linear-gradient(90deg,#BC559E,#E8857A 60%,#9C7CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.mbchat .sig{margin-top:20px;padding-top:16px;border-top:1px solid rgba(22,21,26,.09)}
.mbchat .name{margin:0;font-size:17px;font-weight:600}
.mbchat .role{margin:2px 0 0;font-size:13.5px;color:#8d8b92}
.mbchat .welcome{display:flex;align-items:center;gap:16px;margin-bottom:16px;padding:16px 20px;border-radius:20px;background:rgba(255,255,255,.75);border:1px solid rgba(188,85,158,.18);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.mbchat .wberry{width:64px;height:64px;flex:none;-webkit-mask-image:radial-gradient(circle,#000 40%,transparent 66%);mask-image:radial-gradient(circle,#000 40%,transparent 66%)}
.mbchat .w1{margin:0;font-size:19px;font-weight:620;letter-spacing:-.02em}
.mbchat .w2{margin:4px 0 0;font-size:15px;line-height:1.55;color:#55535b}
.mbchat .card{border-radius:28px;background:rgba(255,255,255,.88);border:1px solid rgba(22,21,26,.08);box-shadow:0 40px 80px -50px rgba(22,21,26,.35);padding:clamp(22px,4vw,40px);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.mbchat .fine{margin:32px 0 0;font-size:12.5px;color:#8d8b92}
.mbchat .later{margin:16px 0 0;text-align:center;font-size:14px;color:#55535b}
.mbchat .later a{color:#16151a;border-bottom:1px solid #BC559E;text-decoration:none}
.mbchat [class~="bg-[#16151a]"]{background:#16151a}
@media (max-width:1239px){
  .mbchat .cols{max-width:980px}
  .mbchat .cols{grid-template-columns:1fr}
  .mbchat .host{position:static;display:grid;grid-template-columns:96px 1fr;gap:4px 16px;align-items:center}
  .mbchat .photo{grid-row:span 2;border-radius:50%;width:96px;height:96px}
  .mbchat .photo img{height:96px}
  .mbchat .quote{display:none}
  .mbchat .big{margin:0;font-size:19px}
  .mbchat .sig{margin:0;padding:0;border:0}
  .mbchat .main{order:-1}
}
`
