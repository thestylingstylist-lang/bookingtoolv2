"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { startUpload, finishUpload } from "./upload-actions"

export default function UploadButton({ token, docId }: { token: string; docId: string }) {
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
      const start = await startUpload(token, docId, file.name, file.size, file.type)
      if (!start.ok) {
        setError(start.error)
        return
      }
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { error: upErr } = await supabase.storage
        .from("client-docs")
        .uploadToSignedUrl(start.path, start.uploadToken, file, { contentType: file.type })
      if (upErr) {
        setError("The upload didn't go through. Please try again.")
        return
      }
      const done = await finishUpload(token, docId, start.path, file.name)
      if (!done.ok) {
        setError("Something went wrong. Please try again.")
        return
      }
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
        accept="application/pdf,image/*"
        className="hidden"
        onChange={onPick}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="text-xs font-medium text-[#b08477] hover:underline disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload ↑"}
      </button>
      {error && <span className="mt-0.5 max-w-[200px] text-right text-[11px] text-red-700">{error}</span>}
    </span>
  )
}
