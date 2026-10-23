// New home page sections: the "six places" picture, and what Marvberry does.
// They sit inside the home page (.mb) and use its colors, fonts and classes.
const MESS = ["Texts", "Missed calls", "Email threads", "PDFs to sign", "Calendar back-and-forth", "Listing links"]
const NEAT = ["Bookings", "Agreements", "Offers", "Client updates"]

export function Hub() {
  const ly = (i: number) => 40 + i * 64
  const ry = (i: number) => 88 + i * 82
  // Tangled on the left, clean on the right.
  const tangle = [
    "M190 40 C 300 160, 260 300, 500 210",
    "M190 104 C 340 20, 300 360, 500 210",
    "M190 168 C 260 330, 380 60, 500 210",
    "M190 232 C 330 100, 280 280, 500 210",
    "M190 296 C 250 140, 420 380, 500 210",
    "M190 360 C 360 260, 260 90, 500 210",
  ]
  return (
    <svg className="hub" viewBox="0 0 1000 400" role="img" aria-label="Texts, calls, emails, PDFs, calendars and listing links all tangled, then running cleanly through Marvberry into bookings, agreements, offers and client updates">
      {tangle.map((d, i) => (
        <path key={i} d={d} className="tl" />
      ))}
      {NEAT.map((_, i) => (
        <path key={i} d={`M500 210 C 640 210, 640 ${ry(i)}, 790 ${ry(i)}`} className="nl" />
      ))}
      {MESS.map((t, i) => (
        <g key={t}>
          <rect x="10" y={ly(i) - 18} width="180" height="36" rx="18" className="chip-m" />
          <text x="100" y={ly(i) + 5} textAnchor="middle" className="chip-t m">{t}</text>
        </g>
      ))}
      <circle cx="500" cy="210" r="62" className="core" />
      <text x="500" y="217" textAnchor="middle" className="core-t">Marvberry</text>
      {NEAT.map((t, i) => (
        <g key={t}>
          <rect x="790" y={ry(i) - 20} width="190" height="40" rx="20" className="chip-n" />
          <text x="885" y={ry(i) + 5} textAnchor="middle" className="chip-t n">{t}</text>
        </g>
      ))}
    </svg>
  )
}


function Feature({
  hand,
  title,
  lead,
  points,
  flip,
  children,
}: {
  hand: string
  title: string
  lead: string
  points: string[]
  flip?: boolean
  children: React.ReactNode
}) {
  return (
    <article className={`feat${flip ? " flip" : ""}`}>
      <div className="feat-copy">
        <p className="hand gold">{hand}</p>
        <h3>{title}</h3>
        <p className="lead">{lead}</p>
        <ul className="ticks">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="feat-pic">{children}</div>
    </article>
  )
}


export function Features() {
  return (
    <section className="what">
      <p className="hand gold">a solid foundation</p>
      <h2>Everything your deals run on. Set up with you.</h2>
      <p className="lead c">No tech skills. We build it with you, then you just use it.</p>

      <Feature
        hand="booking"
        title="Booking built around real estate."
        lead="One link with your name and your hours. Buyers pick a time that works for you, and you never go back and forth."
        points={[
          "Your days, your hours, your days off",
          "Video or phone, your buyer picks",
          "Notice time, so nobody books you in an hour",
          "Confirmations and reminders sent for you",
          "Buyers can reschedule or cancel themselves",
        ]}
      >
        <div className="ui">
          <p className="ui-k">Book with Samantha</p>
          <div className="days">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
              <span key={d} className={i === 2 ? "on" : ""}>{d}</span>
            ))}
          </div>
          <div className="slots">
            {["10:00 AM", "11:30 AM", "1:00 PM", "3:30 PM"].map((t, i) => (
              <span key={t} className={i === 1 ? "on" : ""}>{t}</span>
            ))}
          </div>
          <p className="ui-foot">Wednesday · 11:30 AM · Video call</p>
        </div>
      </Feature>

      <Feature
        flip
        hand="agreements"
        title="Agreements, signed from their phone."
        lead="Your own agreement, already filled in with your terms. Send it in one click. They sign in about a minute."
        points={[
          "Your templates, with the blanks filled in for you",
          "Signed from any phone, no app, no account",
          "See right away who signed and who hasn't",
          "Every signed copy saved under their name",
        ]}
      >
        <div className="ui">
          <p className="ui-k">Buyer Agreement · Jordan Taylor</p>
          <p className="ui-line">Term: 90 days · Exclusive</p>
          <p className="ui-line">Compensation: 2.5%</p>
          <p className="sigline">Jordan Taylor</p>
          <p className="ui-ok">Signed today at 9:14 AM</p>
        </div>
      </Feature>

      <Feature
        hand="offers"
        title="Your offer, ready in minutes."
        lead="Paste the listing link and the home is added for you. Your buyer's documents are already in. Marvberry builds the offer, you look it over and send it."
        points={[
          "Paste a Zillow or realtor.com link, and the home is added",
          "Your buyer uploads their own documents",
          "The offer goes straight to the listing agent",
          "Your buyer sees “Offer sent” on their page",
        ]}
      >
        <div className="ui">
          <p className="ui-k">Offer · 18 Elm Rd</p>
          <p className="ui-big">$545,000</p>
          <p className="ui-line">Pre-approval, ID, proof of funds attached</p>
          <p className="ui-line">To: David Chen, Keller Williams</p>
          <p className="ui-ok">Sent in 4 minutes</p>
        </div>
      </Feature>

      <Feature
        flip
        hand="follow-up"
        title="Follow up on the deal, not just the lead."
        lead="Marvberry keeps every deal moving. It writes the reminder, flags the offer that's about to run out, and tells you each morning what matters. Part of the Closer plan."
        points={[
          "Reminders to your buyers, written in your voice",
          "Offer follow-ups, already written",
          "A short morning update on every deal",
          "You approve everything. It all goes out in your name.",
        ]}
      >
        <div className="ui">
          <p className="ui-k">Good morning, Samantha</p>
          <p className="ui-line">Jordan&rsquo;s proof of funds is due today. A reminder is ready.</p>
          <p className="ui-line">Your offer on 18 Elm Rd runs out tomorrow. The follow-up is written.</p>
          <p className="ui-ok">2 things today. That&rsquo;s it.</p>
        </div>
      </Feature>
    </section>
  )
}
