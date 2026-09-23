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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-sage">Agent access</p>
        <h1 className="mt-2 font-serif text-3xl">Choose a new password</h1>
      </header>
      <ResetForm />
      <AuthFooter />
    </main>
  )
}
