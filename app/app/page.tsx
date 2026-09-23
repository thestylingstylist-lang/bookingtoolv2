import Link from "next/link"
import AuthFooter from "@/app/auth-footer"

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <nav className="flex items-center justify-between py-6">
        <span className="font-serif text-2xl">Marvberry</span>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/login" className="font-medium text-ink/70 hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-ink px-5 py-2.5 font-medium text-paper transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 sm:py-28">
        <p className="text-sm font-medium tracking-wide text-sage">For solo real estate agents</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
          Booking is where it starts. Not where it ends.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
          Marvberry gives you a booking page, your paperwork, and a checklist your clients can
          actually see, so nobody is left wondering what happens next.
        </p>
        <CTA />
      </section>

      {/* The pain */}
      <section className="border-t border-ink/10 py-20">
        <p className="text-sm font-medium tracking-wide text-sage">Here&rsquo;s how it goes right now</p>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          <Step n="01" title="Your scheduling link books the consult.">
            Great. A name, a time, a meeting. That part works.
          </Step>
          <Step n="02" title="Then everything scatters.">
            A text thread here. An email chain there. An agreement they said they&rsquo;d sign
            &ldquo;tonight.&rdquo; Your notes live on your phone, in your head, on a sticky note.
          </Step>
          <Step n="03" title="Your client texts: “So… what’s next?”">
            You answer the same question for the fifth time this week, and wonder what else
            slipped through while you were answering it.
          </Step>
        </div>
        <p className="mt-12 max-w-2xl font-serif text-2xl leading-snug">
          You&rsquo;re not disorganized. Your tools just stop at the booking.
        </p>
      </section>

      {/* The turn */}
      <section className="rounded-3xl bg-ink px-8 py-16 text-paper sm:px-14">
        <h2 className="max-w-3xl font-serif text-3xl leading-tight sm:text-5xl">
          What if your booking link was the front door to the whole deal?
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/75">
          One link brings them in. Everything after that lives in one place, for you and for them.
        </p>
      </section>

      {/* Goals */}
      <section className="py-20">
        <Goal n="Goal No. 1" title="Get booked on your terms">
          Your own booking page, one link to share everywhere. Clients pick a time inside your real
          working hours and leave their phone and email, so every booking is a lead you can follow up.
        </Goal>
        <Goal n="Goal No. 2" title="Get the paperwork done without the chase">
          Keep your agency agreement and state disclosures as ready-to-send templates. Signed copies
          live under each client, where you&rsquo;ll actually find them.
        </Goal>
        <Goal n="Goal No. 3" title="Keep every client in the loop">
          A shared checklist shows your client each step of the process and what&rsquo;s done.
          Fewer &ldquo;what&rsquo;s next?&rdquo; texts. More clients who feel taken care of, and
          refer you.
        </Goal>
      </section>

      {/* Reframe */}
      <section className="border-t border-ink/10 py-20">
        <h2 className="max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">
          You don&rsquo;t need another app. You need one place.
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
          A scheduler, a signing tool, a notes app, a text thread and a spreadsheet. Five places to
          check, and your client can see none of them. Marvberry puts the booking, the paperwork
          and the progress in one spot built for how solo agents actually work.
        </p>
      </section>

      {/* Founder */}
      <section className="grid gap-10 border-t border-ink/10 py-20 sm:grid-cols-[1fr_2fr]">
        <div className="flex aspect-square items-center justify-center rounded-3xl border border-dashed border-ink/20 text-sm text-ink/40">
          [YOUR PHOTO]
        </div>
        <div>
          <p className="text-sm font-medium tracking-wide text-sage">Why I built Marvberry</p>
          <h2 className="mt-3 font-serif text-3xl">[YOUR NAME], founder</h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            I kept seeing the same thing: great agents, good clients, and a process held together by
            texts and memory. The client felt left in the dark. The agent felt stretched thin.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            So I built the tool I wished they had. Not another scheduler, a system that walks your
            client from the first booking to the closing table, with you in control the whole way.
          </p>
        </div>
      </section>

      {/* Founding agents */}
      <section className="mb-20 rounded-3xl border border-ink/10 bg-white/60 px-8 py-16 text-center sm:px-14">
        <p className="text-sm font-medium tracking-wide text-sage">Founding agents</p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
          Be one of the first 30 agents on Marvberry.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
          Founding agents get in free and help decide what we build next. Your feedback goes straight
          to the person building it.
        </p>
        <div className="flex justify-center">
          <CTA />
        </div>
      </section>

      <div className="pb-10">
        <AuthFooter />
      </div>
    </div>
  )
}

function CTA() {
  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/signup"
          className="rounded-xl bg-ink px-7 py-4 text-base font-medium text-paper transition-opacity hover:opacity-90"
        >
          Get started free
        </Link>
        <Link href="/login" className="text-base font-medium text-ink/70 hover:text-ink">
          Sign in
        </Link>
      </div>
      <p className="mt-4 text-sm text-ink/50">No credit card required.</p>
    </div>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-serif text-sm text-brass">{n}</p>
      <h3 className="mt-2 font-serif text-xl leading-snug">{title}</h3>
      <p className="mt-3 leading-relaxed text-ink/60">{children}</p>
    </div>
  )
}

function Goal({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-ink/10 py-10 first:border-t-0 sm:grid-cols-[1fr_2fr]">
      <div>
        <p className="text-sm font-medium tracking-wide text-sage">{n}</p>
        <h3 className="mt-2 font-serif text-2xl leading-snug">{title}</h3>
      </div>
      <p className="text-lg leading-relaxed text-ink/70">{children}</p>
    </div>
  )
}
