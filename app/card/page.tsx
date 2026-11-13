import type { Metadata } from "next"
import ClaimForm from "./claim-form"

export const metadata: Metadata = {
  title: "The Marvberry Card · Your digital business card, with booking",
  description: "A digital business card for real estate agents. Clients book you right from your card. Free.",
}

// The free card's own front door, separate from the Marvberry trial.
export default function ClaimCardPage() {
  return (
    <main className="claim">
      <div className="wrap">
        <p className="kick">The Marvberry Card</p>
        <h1 className="s">
          <span className="i">Your business card,</span>
          <br />
          with booking.
        </h1>
        <p className="s lede">A gift, just for you. It’s free, and it’s yours.</p>
        <ul className="s pts">
          <li>Your photo, your name, your style.</li>
          <li>Clients book a time right from your card.</li>
          <li>You’ll know who opened it, saved it, and booked.</li>
        </ul>
        <ClaimForm />
      </div>
      <style>{CSS}</style>
    </main>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
.claim{min-height:100dvh;background:#FAFAFA;color:#2A2522;display:grid;place-items:center;padding:48px 24px;font-family:var(--font-geist-sans),system-ui,sans-serif}
.claim .wrap{width:100%;max-width:440px;text-align:center}
.claim .s{font-family:'Cormorant Garamond','Iowan Old Style',Georgia,serif}
.claim .i{font-style:italic;color:#6b6259}
.claim .kick{margin:0;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8a8279}
.claim h1{margin:18px 0 0;font-size:clamp(40px,7vw,54px);font-weight:400;line-height:1.02}
.claim .lede{margin:16px 0 0;font-size:21px;color:#4a433d}
.claim .pts{list-style:none;margin:28px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:19px}
.claim .cf{margin-top:34px;display:flex;flex-direction:column;text-align:left}
.claim .cf input{font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;color:#2A2522;background:transparent;border:0;border-bottom:1px solid #cfc9c1;border-radius:0;padding:12px 2px;outline:none}
.claim .cf input:focus{border-color:#2A2522}
.claim .cf input::placeholder{color:#a39b90}
.claim .cf button{margin-top:28px;font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#2A2522;background:transparent;border:1.5px solid #2A2522;border-radius:14px;padding:12px;cursor:pointer}
.claim .cf button:hover{background:#f1efec}
.claim .cf button:disabled{opacity:.5}
.claim .err{margin:14px 0 0;font-size:13px;color:#a3322a}
.claim .fine{margin:16px 0 0;font-size:12px;color:#a39b90;text-align:center;line-height:1.6}
.claim .fine a{color:#8a8279}
`
