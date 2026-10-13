// The Marvberry team's own way in. Only the team email gets through; it lands on admin.
import type { Metadata } from "next"
import { PRODUCT_NAME } from "@/lib/support"
import LoginForm from "../login/login-form"

export const metadata: Metadata = { title: "Team log in", robots: { index: false, follow: false } }

export default function TeamLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#2b2520] px-5 py-16">
      <div className="w-full max-w-[400px] rounded-[22px] border border-[#e6ddce] bg-[#faf7f1] px-8 pb-8 pt-10 shadow-[0_18px_60px_rgba(0,0,0,0.35)] sm:px-10">
        <div className="mb-8 text-center">
          <img src="/marvberry-mark.png" alt={PRODUCT_NAME} width={44} height={44} className="mx-auto h-11 w-11" />
          <h1 className="mt-5 font-[Georgia,serif] text-[30px] leading-tight text-[#2b2520]">Team log in</h1>
          <p className="mt-2 text-sm text-[#8a8072]">For the Marvberry team only.</p>
        </div>
        <LoginForm team />
      </div>
    </main>
  )
}
