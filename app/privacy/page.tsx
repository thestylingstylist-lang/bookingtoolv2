// Marvberry's privacy policy. Plain words, every service named.
import type { Metadata } from "next"
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy — Marvberry" },
  description: "What Marvberry collects, why, who helps us run it, and the choices you have.",
}

const EFFECTIVE = "October 28, 2026"
const MAIL = "team@marvberry.com"

export default function Privacy() {
  return (
    <div className="pp">
      <style>{CSS}</style>

      <header className="nav">
        <a href="/" className="mark">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={140} height={27} style={{ height: 27, width: "auto" }} />
        </a>
      </header>

      <main>
        <h1>Privacy Policy</h1>
        <p className="meta">Effective {EFFECTIVE}</p>

        <p className="intro">
          This policy explains what information Marvberry collects, why we collect it, who helps us run Marvberry, and
          the choices you have. We wrote it in plain words on purpose. If anything here isn&rsquo;t clear, email us at{" "}
          <a href={`mailto:${MAIL}`}>{MAIL}</a>.
        </p>

        <nav className="toc" aria-label="On this page">
          <ol>
            {SECTIONS.map(([id, t]) => (
              <li key={id}>
                <a href={`#${id}`}>{t}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="who">
          <h2>1. Who we are</h2>
          <p>
            Marvberry is run by <strong>Alecia Ford International LLC</strong>, a New Jersey limited liability company,
            doing business as Marvberry (&ldquo;Marvberry,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). Marvberry is a
            workflow platform for real estate agents.
          </p>
          <p>This policy covers three groups of people:</p>
          <ul>
            <li>
              <strong>Agents</strong> who sign up for and use Marvberry.
            </li>
            <li>
              <strong>Clients</strong> who book with an agent, sign documents, or use a client page an agent sends them.
            </li>
            <li>
              <strong>Visitors</strong> to marvberry.com.
            </li>
          </ul>
        </section>

        <section id="roles">
          <h2>2. Our two roles</h2>
          <p>
            <strong>For agents and visitors,</strong> we decide how your information is used, and this policy explains
            how.
          </p>
          <p>
            <strong>For an agent&rsquo;s clients,</strong> we handle your information on that agent&rsquo;s behalf, only
            so we can provide Marvberry to them. The agent decides what to collect from you and what to do with it, and
            they&rsquo;re responsible for their own relationship with you. For questions about how an agent uses your
            information, contact the agent. You can always contact us too.
          </p>
        </section>

        <section id="collect">
          <h2>3. What we collect</h2>
          <h3>Information agents give us</h3>
          <p>
            Name, email, phone, business name, brokerage, license number, photo, logo, email signature, electronic
            signature, calendar and booking settings, document templates, and anything else you add to your account.
          </p>
          <h3>Information about clients</h3>
          <p>
            Name, email, phone, booking details, documents and signatures, messages, homes and listing links, notes, deal
            steps, offers, and files uploaded to a client page. When a client signs a document, we also record the date,
            time and IP address of the signature so the agent has a record of it.
          </p>
          <h3>Payment information</h3>
          <p>
            Payments are processed by Stripe. We receive your billing name and email, the last four digits of your card,
            and the status of your subscription. <strong>We never see or store your full card number.</strong>
          </p>
          <h3>Information from Google sign-in</h3>
          <p>
            If you choose to sign in with Google, we receive your name, email address and profile photo. We do not ask
            for, and cannot see, your Gmail, Google Drive, Google Calendar or contacts.
          </p>
          <h3>Information collected automatically</h3>
          <p>
            When you use Marvberry or visit our site, we collect your IP address, browser and device type, the pages you
            visit, sign-in times, and error logs. On our home page, we also measure how visitors use the page, like how
            far they scroll and which buttons they tap. More on that in <a href="#cookies">Cookies and analytics</a>.
          </p>
        </section>

        <section id="use">
          <h2>4. How we use information</h2>
          <ul>
            <li>To create and run accounts, including signing you in.</li>
            <li>To book meetings and send confirmations and reminders.</li>
            <li>To prepare, send and store agreements and signatures.</li>
            <li>To show clients where their deal stands on their client page.</li>
            <li>To draft messages with our AI assistant, when an agent uses it.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To answer support requests and help agents get set up.</li>
            <li>To send service emails, like receipts, reminders and account notices.</li>
            <li>To send agents product news and tips. You can unsubscribe any time.</li>
            <li>To understand how our site is used, so we can make it better.</li>
            <li>To keep Marvberry secure, prevent fraud and fix problems.</li>
            <li>To follow the law.</li>
          </ul>
          <p>
            Where the law asks for a reason to use your information, ours are: to provide the service you signed up for,
            our legitimate interest in running and improving Marvberry safely, your consent where we ask for it, and our
            legal obligations.
          </p>
        </section>

        <section id="ai">
          <h2>5. Our AI assistant</h2>
          <ul>
            <li>The AI assistant drafts messages, like reminders and replies, using only the deal details that draft needs.</li>
            <li>Drafts are written using Claude, an AI model from Anthropic.</li>
            <li>
              <strong>We do not use your data or your clients&rsquo; data to train AI models.</strong> Under its commercial
              terms, Anthropic does not train its models on what we send it.
            </li>
            <li>The assistant does not make decisions about anyone. It writes drafts, and that&rsquo;s it.</li>
            <li>Nothing the assistant writes goes out unless the agent has turned that on or sends it themselves.</li>
          </ul>
        </section>

        <section id="google">
          <h2>6. Google user data</h2>
          <p>
            Marvberry&rsquo;s use and transfer of information received from Google APIs follows the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We use Google data only to sign you in and set up your account. We
            do not sell it, use it for advertising, or use it to train AI models, and no person reads it except when
            needed for security, to follow the law, or with your permission.
          </p>
        </section>

        <section id="share">
          <h2>7. Who we share information with</h2>
          <p className="callout">
            We do not sell personal information, and we do not share it for targeted advertising.
          </p>
          <p>We share information only with the companies that help us run Marvberry, and only what each one needs:</p>
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>What it does for us</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map(([n, d]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Each of these companies may use the information only to provide its service to us. We may also share
            information:
          </p>
          <ul>
            <li>
              <strong>When the law requires it,</strong> like a valid subpoena or court order.
            </li>
            <li>
              <strong>To protect</strong> the safety, rights or property of our users, the public, or Marvberry.
            </li>
            <li>
              <strong>In a business transfer,</strong> like a merger or sale. If that happens, we&rsquo;ll tell you, and
              this policy will still protect your information.
            </li>
          </ul>
          <p>
            <strong>Partners.</strong> If you signed up through a partner&rsquo;s link, that partner sees your first name
            and last initial, whether you&rsquo;re on a free trial or paying, and the commission they earned. They never
            see your clients or anything inside your account.
          </p>
          <p>
            And of course, when an agent sends a client a booking page, a document or a client page, the client&rsquo;s
            information is shared with that agent. That&rsquo;s how Marvberry works.
          </p>
        </section>

        <section id="cookies">
          <h2>8. Cookies and analytics</h2>
          <p>
            <strong>Cookies we need.</strong> We use cookies to keep you signed in and to keep your account secure.
            Marvberry doesn&rsquo;t work without them. If you arrive through a partner&rsquo;s link, we also set a cookie
            for 60 days that remembers which partner sent you, so they get credit if you sign up.
          </p>
          <p>
            <strong>Home page analytics.</strong> On our home page only, we use two tools to see how visitors use the
            page:
          </p>
          <ul>
            <li>
              <strong>Microsoft Clarity</strong> records how visitors move through the page, like clicks, scrolls and
              mouse movement, and builds heatmaps. It uses cookies to do this. You can read{" "}
              <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">
                Microsoft&rsquo;s privacy statement
              </a>
              .
            </li>
            <li>
              <strong>Our own visit counter</strong> notes how long the page is open, how far a visitor scrolls, which
              sections they see, and whether they tap a sign-up button. It doesn&rsquo;t use cookies.
            </li>
          </ul>
          <p>
            We don&rsquo;t use these tools inside your account or on client pages, and we don&rsquo;t use advertising
            cookies or ad pixels. You can block or delete cookies in your browser settings. Blocking analytics cookies
            won&rsquo;t change how the site works for you.
          </p>
          <p>
            <strong>Do Not Track.</strong> Marvberry doesn&rsquo;t currently respond to Do Not Track signals from
            browsers.
          </p>
        </section>

        <section id="keep">
          <h2>9. How long we keep information</h2>
          <ul>
            <li>
              <strong>Open accounts:</strong> we keep your information as long as your account is open.
            </li>
            <li>
              <strong>Closed accounts:</strong> we delete your account and your clients&rsquo; information within 30
              days after it closes. Before we delete it, we&rsquo;ll email you so you can download your clients and
              documents.
            </li>
            <li>
              <strong>What we must keep:</strong> some records, like billing and tax records, we keep as long as the law
              requires.
            </li>
            <li>
              <strong>Signed documents:</strong> kept until the agent deletes them or closes their account. Agents are
              responsible for keeping their own copies for their brokerage and their state&rsquo;s record-keeping rules.
            </li>
            <li>
              <strong>Backups:</strong> deleted information can stay in our backups for a short time before they cycle
              out.
            </li>
          </ul>
        </section>

        <section id="safe">
          <h2>10. How we protect information</h2>
          <ul>
            <li>Information is encrypted while it travels and while it&rsquo;s stored.</li>
            <li>Each agent&rsquo;s data is kept separate. Only that agent can see their clients.</li>
            <li>Client pages and signing links use private links that are hard to guess.</li>
            <li>Only the people who need it to run Marvberry can get to your information.</li>
          </ul>
          <p>
            No system is perfectly secure. If a breach affects your information, we&rsquo;ll tell you as the law requires.
            Please keep your password private, and don&rsquo;t share your client page links with anyone you don&rsquo;t
            trust.
          </p>
        </section>

        <section id="rights">
          <h2>11. Your rights and choices</h2>
          <p>You can ask us to:</p>
          <ul>
            <li>
              <strong>Tell you</strong> what information we have about you.
            </li>
            <li>
              <strong>Correct</strong> it.
            </li>
            <li>
              <strong>Delete</strong> it.
            </li>
            <li>
              <strong>Send you a copy</strong> of it.
            </li>
            <li>
              <strong>Stop</strong> sending you marketing emails. Every one has an unsubscribe link.
            </li>
          </ul>
          <p>
            Agents can also update most of their information in Settings. To make a request, email{" "}
            <a href={`mailto:${MAIL}`}>{MAIL}</a>. We&rsquo;ll confirm it&rsquo;s really you, then answer within 45 days.
            You can have someone you authorize make a request for you. We will never charge you more or treat you
            differently for using your rights.
          </p>
          <p>
            <strong>Clients:</strong> if your information came to us through an agent, we may pass your request to that
            agent, since they control it, and help them answer it.
          </p>
          <p>
            <strong>California residents:</strong> under California law, you have the right to know what personal
            information we collect, use and share, and to correct or delete it. You also have the right to opt out of
            the sale or sharing of your personal information. We don&rsquo;t sell or share it. In the last 12 months, we
            collected the kinds of information listed in <a href="#collect">What we collect</a>, for the reasons in{" "}
            <a href="#use">How we use information</a>, and shared it only as described in{" "}
            <a href="#share">Who we share information with</a>.
          </p>
          <p>
            <strong>Other states:</strong> if you live in a state with its own privacy law, like New Jersey, Virginia,
            Colorado, Connecticut or Texas, you have the rights that law gives you. If we say no to a request, you can
            appeal by emailing <a href={`mailto:${MAIL}`}>{MAIL}</a> with &ldquo;Appeal&rdquo; in the subject line.
          </p>
        </section>

        <section id="kids">
          <h2>12. Children</h2>
          <p>
            Marvberry is for adults. It isn&rsquo;t meant for anyone under 18, and we don&rsquo;t knowingly collect
            information from children. If we learn we have, we&rsquo;ll delete it.
          </p>
        </section>

        <section id="where">
          <h2>13. Where information is stored</h2>
          <p>
            Marvberry is run from the United States, and your information is stored in the United States. If you use
            Marvberry from outside the U.S., your information will be moved to and handled in the U.S.
          </p>
        </section>

        <section id="changes">
          <h2>14. Changes to this policy</h2>
          <p>
            If we change this policy, we&rsquo;ll update the date at the top. For important changes, we&rsquo;ll email
            agents before the changes take effect.
          </p>
        </section>

        <section id="contact">
          <h2>15. Contact us</h2>
          <p>
            Questions, requests or concerns: <a href={`mailto:${MAIL}`}>{MAIL}</a>
            <br />
            Alecia Ford International LLC, doing business as Marvberry
          </p>
        </section>
      </main>

      <footer className="foot">
        <a href="/">
          <img src="/marvberry-icon.png" alt="" width={31} height={18} /> Marvberry
        </a>
      </footer>
    </div>
  )
}

const SECTIONS: [string, string][] = [
  ["who", "Who we are"],
  ["roles", "Our two roles"],
  ["collect", "What we collect"],
  ["use", "How we use information"],
  ["ai", "Our AI assistant"],
  ["google", "Google user data"],
  ["share", "Who we share information with"],
  ["cookies", "Cookies and analytics"],
  ["keep", "How long we keep information"],
  ["safe", "How we protect information"],
  ["rights", "Your rights and choices"],
  ["kids", "Children"],
  ["where", "Where information is stored"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact us"],
]

const PROVIDERS: [string, string][] = [
  ["Supabase", "Database, file storage and sign-in"],
  ["Vercel", "Hosting our website and app"],
  ["Stripe", "Payments and subscriptions"],
  ["Resend", "Sending emails, like confirmations and reminders"],
  ["Anthropic", "Writing drafts for the AI assistant"],
  ["Zoom", "Video meeting links, if an agent connects Zoom"],
  ["Google", "Sign-in, if you choose it"],
  ["Microsoft Clarity", "Home page analytics"],
]

const CSS = `
.pp{
  --ink:#2A221C; --body:#5E554D; --muted:#9A8F84; --gold:#C9A46C; --rust:#8F4E2A; --rule:#E7DED1; --cream:#F6EFE5;
  --serif:'Playfair Display', Georgia, serif;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  color-scheme:light; background:#fff; color:var(--ink); font-family:var(--sans); min-height:100vh;
}
.pp *{box-sizing:border-box}
.pp a{color:var(--ink); text-decoration:none; border-bottom:1px solid var(--gold)}
.pp a:hover{color:var(--rust)}
.pp :focus-visible{outline:2px solid var(--gold); outline-offset:3px; border-radius:4px}
.pp .nav{padding:22px clamp(20px,5vw,72px)}
.pp .nav a, .pp .foot a{border:0}
.pp main{max-width:720px; margin:0 auto; padding:clamp(32px,6vw,72px) 20px 80px}
.pp h1{font-family:var(--serif); font-weight:400; font-style:italic; font-size:clamp(44px,1rem + 5vw,76px); line-height:1.05; margin:0; letter-spacing:-.01em}
.pp .meta{margin:14px 0 0; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted)}
.pp .intro{margin:28px 0 0; font-family:var(--serif); font-size:clamp(19px,.9rem + .6vw,23px); line-height:1.55}
.pp .toc{margin:40px 0 8px; padding:22px 26px; background:var(--cream); border-radius:16px}
.pp .toc ol{margin:0; padding-left:22px; columns:2; column-gap:40px; font-size:15px; line-height:1.9; list-style:decimal}
.pp .toc li{margin:0; break-inside:avoid; font-size:15px}
.pp .toc li::marker{color:var(--muted)}
.pp .toc a{border:0; color:var(--body)}
.pp .toc a:hover{color:var(--ink)}
.pp section{padding-top:44px; scroll-margin-top:16px}
.pp h2{font-family:var(--serif); font-weight:400; font-size:clamp(26px,1rem + 1vw,32px); line-height:1.2; margin:0 0 14px}
.pp h3{font-size:16px; font-weight:600; margin:22px 0 6px}
.pp p, .pp li{font-size:16.5px; line-height:1.7; color:var(--body)}
.pp p{margin:0 0 12px}
.pp strong{color:var(--ink); font-weight:600}
.pp ul{margin:0 0 12px; padding-left:20px}
.pp li{margin:4px 0}
.pp li::marker{color:var(--gold)}
.pp .callout{padding:16px 20px; border-left:3px solid var(--gold); background:var(--cream); border-radius:0 12px 12px 0; color:var(--ink); font-family:var(--serif); font-size:19px}
.pp .table{overflow-x:auto; margin:6px 0 16px}
.pp table{width:100%; border-collapse:collapse; font-size:15.5px}
.pp th{text-align:left; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:500; padding:8px 12px 8px 0; border-bottom:1px solid var(--rule)}
.pp td{padding:11px 12px 11px 0; border-bottom:1px solid var(--rule); color:var(--body); vertical-align:top}
.pp td:first-child{color:var(--ink); font-weight:600; white-space:nowrap}
.pp .foot{display:flex; justify-content:center; padding:36px 20px 44px; border-top:1px solid var(--rule)}
.pp .foot a{display:flex; align-items:center; gap:8px; font-family:var(--serif); font-size:16px}
@media (max-width:560px){ .pp .toc ol{columns:1} }
`
