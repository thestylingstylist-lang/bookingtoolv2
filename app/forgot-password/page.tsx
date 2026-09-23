import Link from "next/link"
import ForgotForm from "./forgot-form"
import AuthFooter from "@/app/auth-footer"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-sage">Agent access</p>
        <h1 className="mt-2 font-serif text-3xl">Reset your password</h1>
        <p className="mt-2 text-sm text-ink/60">
          Enter the email you signed up with and we&rsquo;ll send you a link.
        </p>
      </header>
      {error === "link" && (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          That link has expired or was already used. Request a new one.
        </p>
      )}
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-ink/60">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brass hover:underline">
          Sign in
        </Link>
      </p>
      <AuthFooter />
    </main>
  )
}
