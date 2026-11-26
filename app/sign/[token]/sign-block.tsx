"use client"

import { useState } from "react"
import { signDocument } from "./actions"
import { BTN, LINE } from "../../suite-ui"

// The signature block at the foot of the document. As the signer types, their name
// appears on the line in script, the way it will be signed. The consent box always
// starts unticked.
export default function SignBlock({
  token,
  today,
  error,
  role = "Buyer’s signature",
  action = signDocument,
  bordered = true,
}: {
  token: string
  today: string
  error?: string
  role?: string
  action?: (formData: FormData) => void | Promise<void>
  bordered?: boolean
}) {
  const [name, setName] = useState("")
  const [agree, setAgree] = useState(false)

  const line = (label: string, content: React.ReactNode) => (
    <div>
      <p className="m-0 text-[12px] text-lxsoft">{label}</p>
      <div className="relative flex h-[54px] items-end border-b border-lxink pb-1">{content}</div>
    </div>
  )
  return (
    <form action={action} autoComplete="off" className={`flex flex-col gap-[22px] ${bordered ? `mt-[30px] border-t ${LINE} pt-[26px]` : ""}`}>
      <input type="hidden" name="token" value={token} />
      {error && (
        <p className="m-0 border-l-2 border-lxblush pl-3 text-[13.5px] text-lxink">
          {error === "save" ? "Something went wrong. Please try again." : "Type your full name and check the box to sign."}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-[18px] sm:grid-cols-[minmax(0,1fr)_190px]">
        {line(
          role,
          name ? (
            <span aria-hidden className="truncate font-sig text-[34px] leading-none text-lxink">
              {name}
            </span>
          ) : (
            <span className="pb-1 font-lux text-[16px] italic text-lxsoft">Sign here</span>
          ),
        )}
        {line("Date", <span className="pb-0.5 text-[13px] text-lxink">{today}</span>)}
      </div>

      <label htmlFor="fullName" className="block text-[12px] text-lxsoft">
        Type your full legal name to sign
        <input
          id="fullName"
          name="fullName"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 block h-12 w-full rounded-[2px] border border-[rgba(31,30,28,.18)] bg-white px-3.5 text-base text-lxink outline-none focus:border-lxink"
        />
      </label>

      <label className="flex items-start gap-3 text-[13.5px] leading-normal">
        <input
          type="checkbox"
          name="agree"
          required
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          autoComplete="off"
          className="mt-[3px] accent-[#1F1E1C]"
        />
        <span>I&rsquo;ve read this agreement, and typing my name is my electronic signature.</span>
      </label>

      <button type="submit" className={`${BTN} w-full`}>
        Sign agreement
      </button>
      <p className="-mt-1.5 text-center text-[11.5px] leading-normal text-lxsoft">
        Your name, the date and time, and your IP address are recorded with your signature.
      </p>
    </form>
  )
}
