"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { startSetupUpload, finishSetupUpload } from "./onboarding-actions"

export default function SetupUpload({ docId, title, replace = false }: { docId: string; title: string; replace?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const start = await startSetupUpload(docId, file.name, file.size, file.type)
      if (!start.ok) return setError(start.error)
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error: upErr } = await supabase.storage
        .from("onboarding-docs")
        .uploadToSignedUrl(start.path, start.uploadToken, file, { contentType: file.type })
      if (upErr) return setError("The upload didn't go through. Please try again.")
      const done = await finishSetupUpload(docId, start.path, file.name)
      if (!done.ok) return setError("Something went wrong. Please try again.")
      router.refresh()
    } catch {
      setError("The upload didn't go through. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="flex flex-col items-end">
      <input
        ref={input}
        type="file"
        accept="application/pdf,.doc,.docx,image/*"
        className="hidden"
        aria-label={`Upload ${title}`}
        onChange={onPick}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={
          replace
            ? "text-xs font-medium text-ink/55 underline underline-offset-4 hover:text-ink disabled:opacity-60"
            : "rounded-[10px] bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
        }
      >
        {busy ? "Uploading…" : replace ? "Replace" : "Upload"}
      </button>
      {error && <span role="alert" className="mt-1 max-w-[220px] text-right text-[11px] text-red-700">{error}</span>}
    </span>
  )
}
