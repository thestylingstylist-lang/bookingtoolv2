import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import LoginForm from "./login-form"

export default function LoginPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-cover bg-center px-5 py-16"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundColor: "#f6f4ee" }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white px-8 py-14 shadow-2xl sm:px-12">
        <h1 className="mb-10 text-center font-serif text-5xl text-black">Log In</h1>
        <LoginForm />
        {SUPPORT_EMAIL && (
          <p className="mt-8 border-t border-black/10 pt-6 text-center text-sm text-black/50">
            Need help?{" "}
            <a href={mailto} className="underline underline-offset-4 hover:text-black">
              {SUPPORT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
