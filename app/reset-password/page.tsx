import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ResetForm from "./reset-form"
import AuthFooter from "@/app/auth-footer"

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Only reachable through a fresh reset link.
  if (!user) redirect("/forgot-password?error=link")
  const fromTemp = !!user.user_metadata?.must_change_password

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <img src="/marvberry-wordmark.png" alt="Marvberry" width={130} height={26} className="mb-8 h-[26px] w-auto" />
        <p className="text-sm font-medium tracking-wide text-sage">Agent access</p>
        <h1 className="mt-2 font-serif font-semibold tracking-tight text-3xl">
          {fromTemp ? "Now choose your own password" : "Choose a new password"}
        </h1>
        {fromTemp && (
          <p className="mt-2 text-sm text-ink/60">You&rsquo;re in. Pick a password only you know, and you&rsquo;re all set.</p>
        )}
      </header>
      <ResetForm />
      <AuthFooter />
    </main>
  )
}
