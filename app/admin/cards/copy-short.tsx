"use client"
import { useState } from "react"

// The short link to text her: marvberry.com/c/kim-x7k2q
export default function CopyShort({ url }: { url: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) })}
      className="underline underline-offset-4"
    >
      {done ? "Copied" : "Copy short link"}
    </button>
  )
}
