import { PRODUCT_NAME, SUPPORT_EMAIL } from "@/lib/support"
import LoginForm from "./login-form"

export default function LoginPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} support`)}`
  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-left-top px-5 py-16"
      style={{ backgroundImage: "url('/login-backdrop.jpg')", backgroundColor: "#f4f3f1" }}
    >
      {/* Frosted cream wash over the product behind */}
      <div aria-hidden className="absolute inset-0 bg-[#f4f0e8]/55 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-[400px] rounded-[22px] border border-[#e4e3e0] bg-[#f7f6f4] px-8 pb-7 pt-10 shadow-[0_18px_60px_rgba(43,37,32,0.16)] sm:px-10">
        <div className="mb-8 text-center">
          <img src="/marvberry-wordmark.png" alt={PRODUCT_NAME} width={180} height={36} className="mx-auto h-9 w-auto" />
          <h1 className="mt-5 font-semibold tracking-tight text-[30px] leading-tight text-[#16151a]">Log in</h1>
        </div>
        <LoginForm />
        {SUPPORT_EMAIL && (
          <p className="mt-7 border-t border-[#e4e3e0] pt-5 text-center text-sm text-[#8e8c93]">
            Need help?{" "}
            <a href={mailto} className="text-[#9a7738] underline-offset-4 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
