"use client"

import { useMemo, useRef, useState } from "react"
import { parsePlaceholders, SUGGESTED_CHIPS } from "@/lib/placeholders"

type Props = {
  action: (formData: FormData) => void | Promise<void>
  id?: string
  initialTitle?: string
  initialBody?: string
  saved?: boolean
  error?: boolean
}

export default function TemplateEditor({
  action,
  id,
  initialTitle = "",
  initialBody = "",
  saved,
  error,
}: Props) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const placeholders = useMemo(() => parsePlaceholders(body), [body])
  const autos = placeholders.filter((p) => p.kind === "auto")
  const deals = placeholders.filter((p) => p.kind === "deal")

  // Insert [[Label]] at the cursor (or append) and keep focus.
  function insertChip(label: string) {
    const token = `[[${label}]]`
    const el = areaRef.current
    if (!el) {
      setBody((b) => b + token)
      return
    }
    const start = el.selectionStart ?? body.length
    const end = el.selectionEnd ?? body.length
    const next = body.slice(0, start) + token + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const inputClass =
    "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"

  return (
    <form action={action}>
      {id && <input type="hidden" name="id" value={id} />}

      {saved && (
        <p className="mb-6 rounded-lg bg-sage/10 px-4 py-3 text-sm text-sage">
          Template saved.
        </p>
      )}
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&rsquo;t save. Please try again.
        </p>
      )}

      <label className="mb-1 block text-sm text-ink/60">Template name</label>
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Buyer agency agreement"
        className={inputClass}
      />

      <label className="mb-1 mt-6 block text-sm text-ink/60">
        Your wording
      </label>
      <p className="mb-2 text-xs text-ink/50">
        Paste your broker&rsquo;s wording. Wrap anything that should become a
        blank in double brackets, like{" "}
        <span className="rounded bg-ink/5 px-1 font-mono">[[Client name]]</span>.
      </p>

      {/* One-tap common blanks */}
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_CHIPS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => insertChip(c)}
            className="rounded-full border border-ink/15 bg-white px-3 py-1 text-xs text-ink/70 hover:border-sage hover:text-ink"
          >
            + {c}
          </button>
        ))}
      </div>

      <textarea
        ref={areaRef}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={16}
        placeholder="This Buyer Agency Agreement is made between [[Client name]] and [[Agent name]] of [[Brokerage]]…"
        className={inputClass + " font-mono leading-relaxed"}
      />

      {/* Detected blanks */}
      {placeholders.length > 0 && (
        <div className="mt-6 rounded-2xl border border-ink/10 bg-white/50 p-5">
          <h3 className="font-serif text-lg">Blanks found</h3>
          {autos.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-sage">
                Filled automatically
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {autos.map((p) => (
                  <span
                    key={p.key}
                    className="rounded-full bg-sage/15 px-3 py-1 text-xs text-sage"
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                You&rsquo;ll fill these per client
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {deals.map((p) => (
                  <span
                    key={p.key}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800"
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        className="mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
      >
        Save template
      </button>
    </form>
  )
}
