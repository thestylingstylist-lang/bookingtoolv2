// The Marvberry team's own way in. Only the team email gets through; it lands on admin.
import type { Metadata } from "next"
import { PRODUCT_NAME } from "@/lib/support"
import LoginForm from "../login/login-form"

export const metadata: Metadata = { title: "Team log in", robots: { index: false, follow: false } }

export default function TeamLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#16151a] px-5 py-16">
      <div className="w-full max-w-[400px] rounded-[22px] border border-[#e4e3e0] bg-[#f7f6f4] px-8 pb-8 pt-10 shadow-[0_18px_60px_rgba(0,0,0,0.35)] sm:px-10">
        <div className="mb-8 text-center">
          <img src="/marvberry-wordmark.png" alt={PRODUCT_NAME} width={180} height={36} className="mx-auto h-9 w-auto" />
          <h1 className="mt-5 font-semibold tracking-tight text-[30px] leading-tight text-[#16151a]">Team log in</h1>
          <p className="mt-2 text-sm text-[#8e8c93]">For the Marvberry team only.</p>
        </div>
        <LoginForm team />
      </div>
    </main>
  )
}
