"use client"
import { useState } from "react"

export default function CopyLink({ link }: { link: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <code className="min-w-0 flex-1 select-all break-all rounded-xl bg-[#f6f5f3] px-4 py-3 text-[15px]">{link}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link)
            setDone(true)
            setTimeout(() => setDone(false), 1800)
          } catch {}
        }}
        className="rounded-full bg-[#16151a] px-5 py-3 text-sm font-medium text-white"
      >
        {done ? "Copied" : "Copy link"}
      </button>
    </div>
  )
}
