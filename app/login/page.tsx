import Wordmark from "../wordmark"
import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import LoginForm from "./login-form"

export default function LoginPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <main
      className="mb-app relative flex min-h-screen items-center justify-center px-5 py-16"
    >
      <div className="relative w-full max-w-[380px] px-2 pb-7 pt-4">
        <div className="mb-8 text-center">
          <Wordmark size={34} />
          <h1 className="mt-5 font-semibold tracking-tight text-[30px] leading-tight text-lxink">Log in</h1>
        </div>
        <LoginForm />
        {SUPPORT_EMAIL && (
          <p className="mt-7 border-t border-lxhair pt-5 text-center text-sm text-[#8f8b84]">
            Need help?{" "}
            <a href={mailto} className="text-lxgolddeep underline-offset-4 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
