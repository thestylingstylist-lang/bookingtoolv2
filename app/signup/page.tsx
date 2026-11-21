import Wordmark from "../wordmark"
import AuthFooter from "@/app/auth-footer"
import Link from "next/link"
import SignupForm from "./signup-form"

export default function SignupPage() {
  return (
    <main className="mb-app min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <Wordmark size={28} className="mb-8" />
        <p className="text-sm font-medium tracking-wide text-lxgold">Get started</p>
        <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-lxink/60">
          Set up your booking page and client workflow in a couple of minutes.
        </p>
      </header>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-lxink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-lxink hover:underline">
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </div>
    </main>
  )
}
