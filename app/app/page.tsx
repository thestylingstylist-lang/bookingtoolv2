import Link from "next/link"

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-sage">For real estate agents</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">
        Your clients, never left in the dark.
      </h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink/70">
        Give every client one place to book a consultation, sign what they need to
        sign, and see exactly what happens next. You stay organized; they stay calm.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
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
      <p className="mt-4 text-sm text-ink/50">No credit card required to start.</p>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        <Feature title="A booking page of your own">
          Share one link. Clients pick a time that fits your real hours.
        </Feature>
        <Feature title="Paperwork, handled">
          Send your agreement and disclosures for a quick signature.
        </Feature>
        <Feature title="A shared checklist">
          Clients see each step and tick it off — no more chasing.
        </Feature>
      </div>
    </main>
  )
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/50 p-5">
      <h3 className="font-serif text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">{children}</p>
    </div>
  )
}
