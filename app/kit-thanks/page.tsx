// Thank-you page for The Realtor's AI Client Experience Kit (Kit landing page → here).
// Signup goes straight here (no confirmation step), so the one job of this page is: download the kit.
import type { Metadata } from "next"
import "@fontsource/playfair-display/400.css"
import "@fontsource/playfair-display/400-italic.css"
import "@fontsource/playfair-display/500-italic.css"
import "@fontsource/caveat/500.css"

// The kit itself. Upload the PDF to public/kit/ with this name.
const KIT_PDF = "/kit/realtors-ai-client-experience-kit.pdf"

export const metadata: Metadata = {
  title: { absolute: "Your kit — Marvberry" },
  description: "Download The Realtor\u2019s AI Client Experience Kit.",
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
          <img src="/marvberry-icon.png" alt="" width={21} height={44} className="mbicon" />
          <span>Marvberry</span>
        </a>
      </header>

      <main>
        <section className="get">
          <h1>{name ? <>Here&rsquo;s your kit, {name}.</> : <>Here&rsquo;s your kit.</>}</h1>
          <p className="sub">Three Claude prompts for realtors. Yours to keep.</p>
          <a className="dl" href={KIT_PDF} download>
            Download the kit
          </a>
          <p className="note">
            Trouble downloading? Email us at <a href="mailto:team@marvberry.com">team@marvberry.com</a>.
          </p>
          <img className="pages" src="/brand/kit-pages.webp" width={1568} height={784} alt="Pages from The Realtor's AI Client Experience Kit" />
        </section>

        <section className="intro">
          <p className="hand">Marvberry, the realtor&rsquo;s client experience assistant</p>
          <h2>
            The kit helps you do it by hand.
            <br />
            <em>Marvberry does it for you.</em>
          </h2>
          <p className="lead">
            Those three prompts work. But you still run them yourself, one client at a time. Marvberry runs the same
            things on its own, every day.
          </p>
          <figure className="shots" aria-label="Marvberry: a realtor's booking page and a client's private page">
            <img className="wide" src="/brand/booking-glass.jpg" alt="A realtor's branded booking page" />
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
        <img src="/marvberry-icon.png" alt="" width={16} height={34} className="mbicon" /> Marvberry. <em>The Realtor&rsquo;s Client Experience Assistant</em>
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

/* The one job: get the kit */
.kt .get{background:#F3EEE7; text-align:center; padding:clamp(48px,8vw,96px) 20px 0; overflow:hidden}
.kt h1{font-style:italic; font-size:clamp(46px,1rem + 6vw,100px); line-height:1.02}
.kt .sub{margin-top:18px; font-size:clamp(17px,.9rem + .35vw,20px); color:var(--body)}
.kt .dl{display:inline-block; margin-top:34px; background:var(--ink); color:var(--cream); text-decoration:none; font-family:var(--serif); font-size:clamp(20px,1rem + .5vw,24px); padding:18px 44px; border-radius:999px; box-shadow:0 18px 40px -18px rgba(42,34,28,.6); transition:background .2s, transform .2s}
.kt .dl:hover{background:#433730; transform:translateY(-1px)}
.kt .get .note{display:block; margin-top:18px; font-size:14px; color:var(--body)}
.kt .get .note a{color:var(--ink); text-decoration:none; border-bottom:1px solid var(--gold)}
.kt .pages{display:block; width:min(920px,100%); height:auto; margin:24px auto 0; -webkit-mask-image:radial-gradient(ellipse 72% 80% at 50% 58%, #000 62%, transparent 100%); mask-image:radial-gradient(ellipse 72% 80% at 50% 58%, #000 62%, transparent 100%)}

/* Secondary: a soft Marvberry intro */
.kt .intro{background:var(--linen); text-align:center; padding:clamp(80px,10vw,128px) 20px}
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
  .kt .pages{width:150%; max-width:none; margin:8px 0 0 -25%}
  .kt .foot em{flex-basis:100%}
  .kt .shots .wide{width:92%}
  .kt .shots .phone{width:34%; border-radius:18px; padding:4px}
  .kt .shots .phone img{border-radius:14px}
}
`
