"use client"

import { useState } from "react"
import { signDocument } from "./actions"

const HAND = { fontFamily: "'Caveat', cursive" }

// The signature block at the foot of the document. As the client types,
// their name appears on the line in handwriting, the way it will be signed.
export default function SignBlock({
  token,
  today,
  error,
}: {
  token: string
  today: string
  error?: string
}) {
  const [name, setName] = useState("")

  return (
    <form action={signDocument} className="mt-10 border-t border-[#e6e5e3] pt-8">
      <input type="hidden" name="token" value={token} />
      {error && (
        <p className="mb-5 rounded-lg bg-[#fbe9ef] px-4 py-3 text-sm text-[#c23d6d]">
          {error === "save"
            ? "Something went wrong. Please try again."
            : "Type your full name and check the box to sign."}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_170px]">
        <div>
          <p className="text-[13px] text-[#8a8072]">Buyer&rsquo;s signature</p>
          <div className="relative mt-1 h-14 border-b border-[#2b2520]/50">
            <span
              aria-hidden
              style={HAND}
              className="pointer-events-none absolute bottom-0.5 left-1 text-[38px] leading-none text-[#1f2a5c]"
            >
              {name}
            </span>
            {!name && (
              <span className="pointer-events-none absolute bottom-2 left-1 text-sm italic text-[#b8ad9c]">
                Sign here
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-[#8a8072]">Date</p>
          <div className="mt-1 flex h-14 items-end border-b border-[#2b2520]/50 pb-2 text-[15px] text-[#2b2520]">
            {today}
          </div>
        </div>
      </div>

      <label htmlFor="fullName" className="mt-7 block text-[13px] text-[#8a8072]">
        Type your full legal name to sign
      </label>
      <input
        id="fullName"
        name="fullName"
        required
        minLength={2}
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#d4d2ce] bg-white px-4 py-3 text-base text-[#2b2520] outline-none focus:border-[#2b2520] focus:ring-2 focus:ring-[#2b2520]/10"
      />

      <label className="mt-5 flex items-start gap-3 text-sm text-[#4a433b]">
        <input type="checkbox" name="agree" required className="mt-1 accent-[#16151a]" />
        <span>I&rsquo;ve read this agreement, and typing my name is my electronic signature.</span>
      </label>

      <button
        type="submit"
        className="mt-7 w-full rounded-xl bg-[#16151a] px-6 py-3.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Sign
      </button>
      <p className="mt-3 text-center text-xs text-[#8a8072]">
        Your name, the date and time, and your IP address are recorded with your signature.
      </p>
    </form>
  )
}
