"use client"
// "Upload a PDF form": their own offer letter, logo and all. Then they place the blanks.
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { startPdfTemplate } from "./pdf-actions"

export default function PdfUpload() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setErr("")
    try {
      const st = await startPdfTemplate("", file.name, file.size, file.type)
      if (!st.ok) return setErr(st.error)
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error } = await sb.storage.from("client-docs").uploadToSignedUrl(st.path, st.token, file, { contentType: "application/pdf" })
      if (error) return setErr("The upload didn’t go through. Try again.")
      router.push(`/templates/pdf/${st.id}`)
    } catch {
      setErr("The upload didn’t go through. Try again.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-lg border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5 disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload a PDF form"}
      </button>
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {err && <span className="mt-1 text-xs text-red-700">{err}</span>}
    </span>
  )
}
