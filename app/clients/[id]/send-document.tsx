"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { AUTO_FILL, parsePlaceholders } from "@/lib/placeholders"
import { cleanDoc, normalizeBlanks } from "@/lib/doc-text"
import { sendDocument } from "./actions"

type Template = { id: string; title: string; body: string }

export default function SendDocument({
  clientId,
  templates,
  auto,
  defaultCommission = "",
}: {
  clientId: string
  templates: Template[]
  auto: Record<string, string>
  defaultCommission?: string
}) {
  const [open, setOpen] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  // The agent signs first. Always starts unticked.
  const [agentSigned, setAgentSigned] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const template = templates.find((t) => t.id === templateId)
  // Blanks in any bracket style, markdown stripped: what the client will actually read.
  const source = useMemo(() => cleanDoc(normalizeBlanks(template?.body ?? "")), [template])
  // Ask for every blank the records can't fill, including a record that's empty (no address yet).
  const deals = useMemo(
    () => parsePlaceholders(source).filter((p) => p.kind === "deal" || !(auto[p.key] ?? "").trim()),
    [source, auto]
  )
  // The usual commission from Settings starts in any commission blank; typing replaces it.
  const valueOf = (key: string) => values[key] ?? (key.startsWith("commission") ? defaultCommission : "")
  const ready = deals.every((p) => valueOf(p.key).trim())

  // The document exactly as the client will see it. Filled spots are tinted
  // so the realtor can check each one; anything missing shows in rose.
  const preview = useMemo(() => {
    const body = source
    const parts: ReactNode[] = []
    let last = 0
    let i = 0
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const at = m.index ?? 0
      parts.push(body.slice(last, at))
      const key = m[1].trim().toLowerCase()
      const v = ((AUTO_FILL[key] !== undefined ? auto[key] : "")?.trim() || valueOf(key).trim())
      parts.push(
        v ? (
          <mark key={i++} className="rounded bg-white px-1 text-lxink">{v}</mark>
        ) : (
          <mark key={i++} className="rounded bg-white px-1 italic text-lxgolddeep">
            {m[1].trim()} not on file
          </mark>
        )
      )
      last = at + m[0].length
    }
    parts.push(body.slice(last))
    return parts
  }, [source, auto, values, defaultCommission])

  const guessKind = /disclos/i.test(template?.title ?? "") ? "disclosure" : "agreement"

  const inputClass =
    "w-full rounded-lg border border-lxink/15 bg-white px-3 py-2 text-sm outline-none focus:border-lxgold"

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-lxink/20 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-lxink hover:text-lxbg"
      >
        Send a document
      </button>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="w-full rounded-xl border border-lxink/10 bg-white p-4 text-sm">
        <p className="text-lxink/70">No templates yet. Set up your agreement once, and send it to any client.</p>
        <Link href="/templates/new" className="mt-2 inline-block text-lxgold underline">
          Set up your agreement
        </Link>
      </div>
    )
  }

  return (
    <form action={sendDocument} className="w-full rounded-xl border border-lxink/10 bg-white p-5">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-semibold tracking-tight text-lg">Send a document</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReviewing(false)
          }}
          className="text-sm text-lxink/50 hover:text-lxink"
        >
          Cancel
        </button>
      </div>

      <div className={reviewing ? "hidden" : ""}>
      <label className="mb-1 mt-4 block text-sm text-lxink/60">Template</label>
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

      <label className="mb-1 mt-4 block text-sm text-lxink/60">Type</label>
      <select key={templateId} name="kind" defaultValue={guessKind} className={inputClass}>
        <option value="agreement">Agreement</option>
        <option value="disclosure">Disclosure</option>
      </select>

      {deals.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-lxink">Fill in for this client</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {deals.map((p) => (
              <div key={templateId + p.key}>
                <label className="mb-1 block text-sm text-lxink/60">{p.label}</label>
                <input
                  name={`blank:${p.key}`}
                  required
                  value={valueOf(p.key)}
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
          <p className="mt-4 text-xs text-lxink/50">
            Names, address, and today&rsquo;s date fill in automatically.
          </p>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setReviewing(true)}
            className="mt-4 rounded-lg bg-lxink px-5 py-2.5 text-sm font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Review before sending
          </button>
        </>
      ) : (
        <>
          <p className="mt-6 font-semibold tracking-tight text-[17px] text-lxink">
            Here&rsquo;s exactly what your client will see.
          </p>
          <article className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-lxhair bg-white p-6 font-[Georgia,serif] text-[15px] leading-relaxed text-lxsoft">
            {preview}
          </article>
          <label className="mt-4 flex items-center gap-2.5 text-sm text-lxink">
            <input
              type="checkbox"
              name="agentSign"
              checked={agentSigned}
              onChange={(e) => setAgentSigned(e.target.checked)}
              autoComplete="off"
              className="h-4 w-4 accent-[#1F1E1C]"
            />
            Add my signature and today&rsquo;s date
          </label>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={!agentSigned}
              className="rounded-lg bg-lxink px-5 py-2.5 text-sm font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Sign and send
            </button>
            <button
              type="button"
              onClick={() => setReviewing(false)}
              className="text-sm text-lxink/60 underline underline-offset-2 hover:text-lxink"
            >
              Make a change
            </button>
          </div>
        </>
      )}
    </form>
  )
}
