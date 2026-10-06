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

      <div className="relative w-full max-w-[400px] rounded-[22px] border border-[#e6ddce] bg-[#faf7f1] px-8 pb-7 pt-10 shadow-[0_18px_60px_rgba(43,37,32,0.16)] sm:px-10">
        <div className="mb-8 text-center">
          <img src="/marvberry-mark.png" alt={PRODUCT_NAME} width={44} height={44} className="mx-auto h-11 w-11" />
          <h1 className="mt-5 font-[Georgia,serif] text-[30px] leading-tight text-[#2b2520]">Log in</h1>
        </div>
        <LoginForm />
        {SUPPORT_EMAIL && (
          <p className="mt-7 border-t border-[#e6ddce] pt-5 text-center text-sm text-[#8a8072]">
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
