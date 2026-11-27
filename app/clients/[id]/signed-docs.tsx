"use client"

import { useState } from "react"
import { redoDocument } from "./checklist-actions"
import { ASK_EVENT } from "../../assistant"

// Signed documents on the file. Redo keeps the old copy, marked Replaced, then a new one
// can be prepared by the agent or the assistant. Nothing is redone without a yes.

export type SignedDoc = { id: string; title: string; signedAt: string | null; replaced: boolean }

export default function SignedDocs({
  clientId,
  docs,
  redoId,
  first,
  assistantName,
  tz,
}: {
  clientId: string
  docs: SignedDoc[]
  redoId?: string
  first: string
  assistantName: string
  tz: string
}) {
  const [asking, setAsking] = useState("")
  if (!docs.length) return null
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" })
  const who = first || "the client"
  const redone = redoId ? docs.find((d) => d.id === redoId) : undefined

  return (
    <section className="mb-7">
      <h2 className="text-xs uppercase tracking-[0.08em] text-lxsoft">Signed documents</h2>

      {redone && (
        <div className="mt-3 border-l-2 border-lxgold bg-white px-3.5 py-3">
          <p className="text-[13px] leading-snug text-lxink">
            The old {redone.title} is kept, marked Replaced. Ready for a new one?
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: `Prepare a new ${redone.title} for ${first}` }))}
              className="rounded-[2px] bg-lxink px-3.5 py-1.5 text-[12.5px] text-white"
            >
              Ask {assistantName} to prepare it
            </button>
            <span className="text-[12.5px] text-lxsoft">or send one from the conversation.</span>
          </div>
        </div>
      )}

      <ul className="mt-3">
        {docs.map((d) => (
          <li key={d.id} className="py-2">
            <div className="flex items-center gap-2">
              <span className={`min-w-0 flex-1 text-sm ${d.replaced ? "text-lxsoft" : ""}`}>{d.title}</span>
              <a href={`/documents/${d.id}/pdf`} target="_blank" rel="noopener" className="shrink-0 text-[11px] text-lxgold underline-offset-2 hover:underline">
                Signed copy
              </a>
              {d.replaced ? (
                <span className="rounded-full bg-lxfill px-2.5 py-0.5 text-[11px] text-lxsoft">Replaced</span>
              ) : (
                <button type="button" onClick={() => setAsking(d.id)} className="text-[11.5px] text-lxsoft underline-offset-2 hover:text-lxink hover:underline">
                  Redo
                </button>
              )}
            </div>
            {d.signedAt && <p className="text-[11.5px] text-lxsoft">Signed {day.format(new Date(d.signedAt))}</p>}
            {asking === d.id && (
              <div className="mt-2 rounded-lg border border-[rgba(194,164,107,.6)] bg-white px-3.5 py-3">
                <p className="text-[13px] leading-snug text-lxink">
                  Redo the {d.title}? This copy stays in the file, marked Replaced, and its step reopens in {who}&rsquo;s suite until a new one is signed.
                </p>
                <div className="mt-2.5 flex items-center gap-4">
                  <form action={redoDocument}>
                    <input type="hidden" name="clientId" value={clientId} />
                    <input type="hidden" name="documentId" value={d.id} />
                    <button type="submit" className="rounded-[2px] bg-lxink px-3.5 py-1.5 text-[12.5px] text-white">
                      Redo
                    </button>
                  </form>
                  <button type="button" onClick={() => setAsking("")} className="text-[12.5px] text-lxsoft hover:text-lxink">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
