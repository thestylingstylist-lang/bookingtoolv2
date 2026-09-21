import Link from "next/link"
import SignupForm from "./signup-form"

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-sage">Get started</p>
        <h1 className="mt-2 font-serif text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-ink/60">
          Set up your booking page and client workflow in a couple of minutes.
        </p>
      </header>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brass hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
