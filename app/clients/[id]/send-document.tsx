"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AUTO_FILL, parsePlaceholders } from "@/lib/placeholders"
import { sendDocument } from "./actions"

type Template = { id: string; title: string; body: string }

export default function SendDocument({
  clientId,
  templates,
  auto,
}: {
  clientId: string
  templates: Template[]
  auto: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const template = templates.find((t) => t.id === templateId)
  const deals = useMemo(
    () => parsePlaceholders(template?.body ?? "").filter((p) => p.kind === "deal"),
    [template]
  )
  const ready = deals.every((p) => (values[p.key] ?? "").trim())

  // The document exactly as the client will see it. Filled spots are tinted
  // so the realtor can check each one; anything missing shows in rose.
  const preview = useMemo(() => {
    const body = template?.body ?? ""
    const parts: ReactNode[] = []
    let last = 0
    let i = 0
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const at = m.index ?? 0
      parts.push(body.slice(last, at))
      const key = m[1].trim().toLowerCase()
      const v = (AUTO_FILL[key] !== undefined ? auto[key] : values[key])?.trim() ?? ""
      parts.push(
        v ? (
          <mark key={i++} className="rounded bg-[#fdf3e3] px-1 text-[#2b2520]">{v}</mark>
        ) : (
          <mark key={i++} className="rounded bg-[#fbe9ef] px-1 italic text-[#c23d6d]">
            {m[1].trim()} not on file
          </mark>
        )
      )
      last = at + m[0].length
    }
    parts.push(body.slice(last))
    return parts
  }, [template, auto, values])

  const guessKind = /disclos/i.test(template?.title ?? "") ? "disclosure" : "agreement"

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ink/20 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ox hover:text-paper"
      >
        Send a document
      </button>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="w-full rounded-xl border border-ink/10 bg-white p-4 text-sm">
        <p className="text-ink/70">You don&rsquo;t have a template yet.</p>
        <Link href="/templates/new" className="mt-2 inline-block text-sage underline">
          Create your agreement template
        </Link>
      </div>
    )
  }

  return (
    <form action={sendDocument} className="w-full rounded-xl border border-ink/10 bg-white p-5">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-semibold tracking-tight text-lg">Send a document</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReviewing(false)
          }}
          className="text-sm text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <div className={reviewing ? "hidden" : ""}>
      <label className="mb-1 mt-4 block text-sm text-ink/60">Template</label>
      <select
        name="templateId"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className={inputClass}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>

      <label className="mb-1 mt-4 block text-sm text-ink/60">Type</label>
      <select key={templateId} name="kind" defaultValue={guessKind} className={inputClass}>
        <option value="agreement">Agreement</option>
        <option value="disclosure">Disclosure</option>
      </select>

      {deals.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-brass">Fill in for this client</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {deals.map((p) => (
              <div key={templateId + p.key}>
                <label className="mb-1 block text-sm text-ink/60">{p.label}</label>
                <input
                  name={`blank:${p.key}`}
                  required
                  value={values[p.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {!reviewing ? (
        <>
          <p className="mt-4 text-xs text-ink/50">
            Names, address, and today&rsquo;s date fill in automatically.
          </p>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setReviewing(true)}
            className="mt-4 rounded-lg bg-ox px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Review before sending
          </button>
        </>
      ) : (
        <>
          <p className="mt-6 font-[Georgia,serif] text-[17px] text-[#2b2520]">
            Here&rsquo;s exactly what your client will see.
          </p>
          <article className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#e6e5e3] bg-white p-6 font-[Georgia,serif] text-[15px] leading-relaxed text-[#4a433b]">
            {preview}
          </article>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              className="rounded-lg bg-ox px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Send for signature
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="text-sm text-ink/60 underline underline-offset-2 hover:text-ink"
            >
              Make a change
            </button>
          </div>
        </>
      )}
    </form>
  )
}
