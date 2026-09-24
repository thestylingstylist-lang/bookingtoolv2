"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { parsePlaceholders } from "@/lib/placeholders"
import { sendDocument } from "./actions"

type Template = { id: string; title: string; body: string }

export default function SendDocument({
  clientId,
  templates,
}: {
  clientId: string
  templates: Template[]
}) {
  const [open, setOpen] = useState(false)
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const template = templates.find((t) => t.id === templateId)
  const deals = useMemo(
    () => parsePlaceholders(template?.body ?? "").filter((p) => p.kind === "deal"),
    [template]
  )
  const guessKind = /disclos/i.test(template?.title ?? "") ? "disclosure" : "agreement"

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ink/20 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
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
        <h3 className="font-serif text-lg">Send a document</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
      </div>

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
                <input name={`blank:${p.key}`} required className={inputClass} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink/50">
        Names, address, and today&rsquo;s date fill in automatically. The client gets a private
        link by email.
      </p>

      <button
        type="submit"
        className="mt-4 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Send for signature
      </button>
    </form>
  )
}
