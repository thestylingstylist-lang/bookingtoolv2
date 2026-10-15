"use client"

import { useState } from "react"

// The one-time setup link: copy it into a private window.
export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => setDone(true))
        }}
        className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#16151a]"
      >
        {done ? "Copied. Paste it in a private window" : "Copy setup link"}
      </button>
      <a href={url} className="text-xs text-white/70 underline underline-offset-2">
        Or open it here (you&rsquo;ll leave admin)
      </a>
    </div>
  )
}
