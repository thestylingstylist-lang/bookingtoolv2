// Thank-you page for The Realtor's AI Client Experience Kit (Kit landing page → here).
// Double opt-in is on, so the one job of this page is: go confirm your email.
import type { Metadata } from "next"
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/playfair-display/500-italic.css"
import "@fontsource/caveat/500.css"

export const metadata: Metadata = {
  title: { absolute: "Almost there — Marvberry" },
  description: "Confirm your email and your Client Experience Kit is on its way.",
  robots: { index: false, follow: false },
}

// Kit sends the subscriber's details in the address. We only use the first name,
// and only if it looks like a real name.
type Params = Record<string, string | string[] | undefined>
const NAME_KEYS = ["first_name", "firstname", "firstName", "fname", "subscriber[first_name]", "name"]

function firstNameFrom(params: Params): string {
  for (const k of NAME_KEYS) {
    const raw = params[k]
    const v = (Array.isArray(raw) ? raw[0] : raw)?.trim()
    // Skip empty values, unfilled merge tags like {{ subscriber.first_name }}, and anything that isn't a name.
    if (!v || !/^[\p{L}][\p{L}\s'.\-]*$/u.test(v)) continue
    const first = v.split(/\s+/)[0].replace(/[^\p{L}'\-]/gu, "").slice(0, 24)
    if (first.length < 2) continue
    return first.charAt(0).toLocaleUpperCase() + first.slice(1)
  }
  return ""
}

export default async function KitThanks({ searchParams }: { searchParams: Promise<Params> }) {
  const name = firstNameFrom(await searchParams)
  return (
    <div className="kt">
      <style>{CSS}</style>

      <header className="nav">
        <a href="/" className="mark">
          <img src="/marvberry-wordmark.png" alt="Marvberry" width={140} height={27} style={{ height: 27, width: "auto" }} />
        </a>
      </header>

      <main>
        <section className="confirm">
          <ol className="track" aria-label="Your progress">
            <li className="done">Signed up</li>
            <li className="now">Confirm your email</li>
            <li>Your kit arrives</li>
          </ol>

          <h1>{name ? <>{name}, one more click and it&rsquo;s yours.</> : <>One more click and it&rsquo;s yours.</>}</h1>
          <p className="big">
            Check your inbox. There&rsquo;s an email from me with a big button, so tap it to <strong>confirm</strong>.
          </p>
          <p className="why">
            Why the extra step? Because I only want to land in inboxes that asked for me, and this keeps your inbox safe.
            No bots and no surprise sign-ups, just you saying &ldquo;yes, send it.&rdquo;
          </p>
          <p className="why">Once you confirm, your kit is on its way.</p>
          <p className="sig">Alecia</p>
          <p className="note">
            Don&rsquo;t see it? Check your spam or promotions folder, and drag me into your main inbox while you&rsquo;re
            there.
          </p>
        </section>

        <section className="intro">
          <p className="hand">while you&rsquo;re here</p>
          <h2>
            The kit helps you do it by hand.
            <br />
            <em>Marvberry does it for you.</em>
          </h2>
          <p className="lead">
            Those three prompts work. But you still run them yourself, one client at a time. Marvberry runs the same
            things on its own, every day.
          </p>
          <figure className="shots" aria-label="Marvberry: a real estate agent's booking page and a client's private page">
            <img className="wide" src="/brand/booking-glass.jpg" alt="A real estate agent's branded booking page" />
            <div className="phone">
              <img src="/brand/portal-full.jpg" alt="A client's private page showing their next step" />
            </div>
          </figure>
          <ul>
            <li>
              <span>Booking</span>
              Clients pick a time on your hours. You don&rsquo;t go back and forth.
            </li>
            <li>
              <span>Keeping clients in the loop</span>
              Every client has a page that shows what&rsquo;s next. They check it instead of texting you.
            </li>
            <li>
              <span>Boundaries</span>
              Your evenings and days off stay yours. Clients can&rsquo;t book over them.
            </li>
          </ul>
          <a className="btn" href="/#how">
            See how Marvberry works
          </a>
        </section>
      </main>

      <footer className="foot">
        <img src="/marvberry-icon.png" alt="" width={31} height={18} className="mbicon" /> Marvberry. <em>The Real Estate Agent&rsquo;s Client Experience Assistant</em>
      </footer>
    </div>
  )
}

const CSS = `
.kt{
  --linen:#FFFFFF; --cream:#F6EFE5; --ink:#2A221C; --body:#6B6158; --muted:#9A8F84;
  --gold:#C9A46C; --rust:#8F4E2A; --rule:#E7DED1;
  --serif:'Playfair Display', Georgia, serif; --hand:'Caveat', cursive;
  --sans: var(--font-geist-sans), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
  color-scheme:light; background:var(--linen); color:var(--ink); font-family:var(--sans); min-height:100vh;
}
.kt *{box-sizing:border-box}
.kt a{color:inherit}
.kt :focus-visible{outline:2px solid var(--gold); outline-offset:3px; border-radius:4px}
.kt h1,.kt h2{font-family:var(--serif); font-weight:400; margin:0; letter-spacing:-.01em}
.kt p{margin:0}

.kt .nav{display:flex; align-items:center; padding:22px clamp(20px,5vw,72px)}
.kt .mark{display:flex; align-items:center; gap:10px; text-decoration:none; font-family:var(--serif); font-size:21px}
.kt .mark img{border-radius:0}

/* The one job: go confirm */
.kt .confirm{max-width:760px; margin:0 auto; padding:clamp(48px,9vw,110px) 20px clamp(80px,11vw,140px); text-align:center}
.kt .track{list-style:none; padding:0; margin:0 auto 44px; display:flex; justify-content:center; gap:clamp(10px,3vw,28px); font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)}
.kt .track li{display:flex; align-items:center; gap:8px}
.kt .track li::before{content:""; width:9px; height:9px; border-radius:50%; border:1px solid var(--muted)}
.kt .track li.done::before{background:var(--gold); border-color:var(--gold)}
.kt .track li.now{color:var(--ink); font-weight:500}
.kt .track li.now::before{border:2px solid var(--rust); width:11px; height:11px}
.kt h1{font-style:italic; font-size:clamp(52px,1rem + 7vw,112px); line-height:1}
.kt .big{margin-top:28px; font-family:var(--serif); font-size:clamp(24px,.9rem + 1.6vw,36px); line-height:1.35}
.kt .big strong{font-weight:500; font-style:italic; color:var(--rust)}
.kt .why{margin:18px auto 0; max-width:34rem; font-size:clamp(17px,.9rem + .35vw,20px); line-height:1.65; color:var(--body)}
.kt .sig{margin-top:18px; font-family:var(--hand); font-size:40px; line-height:1; color:var(--ink)}
.kt .note a{color:var(--ink); text-decoration:none; border-bottom:1px solid var(--gold)}
.kt .note{display:inline-block; max-width:100%; margin-top:36px; padding:10px 18px; border:1px solid var(--rule); border-radius:999px; font-size:14px; color:var(--body)}

/* Secondary: a soft Marvberry intro */
.kt .intro{background:var(--cream); text-align:center; padding:clamp(80px,10vw,128px) 20px}
.kt .hand{font-family:var(--hand); font-size:30px; line-height:1; color:var(--gold); margin-bottom:14px}
.kt .intro h2{font-size:clamp(28px,1rem + 2vw,46px); line-height:1.2}
.kt .intro h2 em{font-style:italic}
.kt .lead{margin:24px auto 0; max-width:36rem; font-size:18px; line-height:1.7; color:var(--body)}
.kt .shots{position:relative; max-width:880px; margin:52px auto 0; padding:0 0 56px}
.kt .shots .wide{display:block; width:88%; height:auto; border-radius:20px; box-shadow:0 30px 70px -35px rgba(42,34,28,.45)}
.kt .shots .phone{position:absolute; right:0; bottom:0; width:25%; padding:6px; background:#fff; border-radius:26px; box-shadow:0 30px 60px -25px rgba(42,34,28,.5)}
.kt .shots .phone img{display:block; width:100%; height:auto; aspect-ratio:9/17; object-fit:cover; object-position:top; border-radius:20px}
.kt .intro ul{list-style:none; padding:0; margin:44px auto 0; max-width:620px; text-align:left}
.kt .intro li{padding:20px 0; border-top:1px solid var(--rule); font-size:17px; line-height:1.6; color:var(--body)}
.kt .intro li:last-child{border-bottom:1px solid var(--rule)}
.kt .intro li span{display:block; margin-bottom:4px; font-family:var(--serif); font-size:22px; font-style:italic; color:var(--ink)}
.kt .btn{display:inline-block; margin-top:44px; background:var(--ink); color:var(--cream); text-decoration:none; font-size:15.5px; font-weight:500; padding:15px 30px; border-radius:999px; transition:background .2s}
.kt .btn:hover{background:#433730}

.kt .foot{display:flex; flex-wrap:wrap; text-align:center; align-items:center; justify-content:center; gap:4px 8px; padding:36px 20px 44px; font-family:var(--serif); font-size:16px; color:var(--ink)}
.kt .foot img{border-radius:0}
.kt .foot em{font-style:italic; color:var(--muted)}

@media (max-width:560px){
  .kt .foot em{flex-basis:100%}
  .kt .shots .wide{width:92%}
  .kt .shots .phone{width:34%; border-radius:18px; padding:4px}
  .kt .shots .phone img{border-radius:14px}
  .kt .track{flex-direction:column; align-items:center; gap:8px}
}
`
