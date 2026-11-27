"use client"

import { useState } from "react"
import { toggleTask, deleteTask, reopenStep, renameStep, moveStep, addCollected } from "./checklist-actions"

// One step in "All steps and documents": tick it, reopen it (after a confirm), rename it,
// move it up or down, remove it, and ask the client for a document at this step.

type Doc = { id: string; title: string; received: boolean }

const H = ({ clientId, id }: { clientId: string; id: string }) => (
  <>
    <input type="hidden" name="clientId" value={clientId} />
    <input type="hidden" name="id" value={id} />
  </>
)

const quiet = "text-[12px] text-lxsoft hover:text-lxink"

export default function StepRow({
  clientId,
  step,
  who,
  first,
  last,
  focus,
  docs,
  assistantName = "Diana",
  children,
}: {
  clientId: string
  step: { id: string; title: string; done: boolean }
  who: string
  first: boolean
  last: boolean
  focus?: boolean
  docs: Doc[]
  assistantName?: string
  children?: React.ReactNode
}) {
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [asking, setAsking] = useState(false)
  const [tools, setTools] = useState(false)
  const agreement = step.title === "Agreement signed"

  return (
    <li id={`step-${step.id}`} className={`group scroll-mt-24 py-2 ${focus ? "-mx-2 rounded-lg bg-white px-2 ring-1 ring-lxgold/60" : ""}`}>
      <div className="flex items-start gap-2.5">
        {step.done ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label={`Reopen ${step.title}`}
            title="Reopen"
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-lxgold bg-lxgold text-[10px] leading-none text-white"
          >
            {"✓"}
          </button>
        ) : (
          <form action={toggleTask}>
            <H clientId={clientId} id={step.id} />
            <input type="hidden" name="done" value="1" />
            <button type="submit" aria-label="Mark done" className="mt-0.5 flex h-4 w-4 shrink-0 rounded-[5px] border-[1.5px] border-lxhair bg-white" />
          </form>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {editing ? (
            <form action={renameStep} className="flex items-center gap-2">
              <H clientId={clientId} id={step.id} />
              <input
                name="title"
                defaultValue={step.title}
                autoFocus
                aria-label="Step name"
                className="min-w-0 flex-1 rounded-md border border-lxhair bg-white px-2 py-1 text-sm outline-none focus:border-lxgold"
              />
              <button type="submit" className="text-[12.5px] text-lxink [border-bottom:1px_solid_#C2A46B]">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-[12.5px] text-lxsoft">
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className={`min-w-0 flex-1 text-sm ${step.done ? "text-lxsoft line-through" : ""}`}>{step.title}</span>
              {/* Rename, move, remove, ask for a document: one quiet link, shown on hover on desktop */}
              <button
                type="button"
                onClick={() => setTools((v) => !v)}
                aria-expanded={tools}
                className={`shrink-0 text-[12px] text-lxsoft hover:text-lxink ${tools ? "" : "lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus:opacity-100"}`}
              >
                {tools ? "Close" : "Edit"}
              </button>
            </div>
          )}
          {children}

          {/* Documents asked for at this step */}
          {docs.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-[12.5px] text-lxsoft">
                  <span className={`h-[5px] w-[5px] rounded-full ${d.received ? "bg-lxgold" : "border border-lxsoft"}`} aria-hidden />
                  {d.title}
                  <span className="text-[11px]">{d.received ? "Received" : `Waiting on ${who}`}</span>
                </li>
              ))}
            </ul>
          )}
          {asking && (
            <form action={addCollected} className="mt-1.5 flex items-center gap-2">
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="stepId" value={step.id} />
              <input
                name="title"
                autoFocus
                placeholder="e.g. Pay stubs"
                aria-label="Document to ask for"
                className="min-w-0 flex-1 rounded-md border border-lxhair bg-white px-2 py-1 text-sm outline-none placeholder:text-lxsoft focus:border-lxgold"
              />
              <button type="submit" className="text-[12.5px] text-lxink [border-bottom:1px_solid_#C2A46B]">
                Ask {who}
              </button>
              <button type="button" onClick={() => setAsking(false)} className="text-[12.5px] text-lxsoft">
                Cancel
              </button>
            </form>
          )}

          {tools && !editing && !asking && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button type="button" onClick={() => setEditing(true)} className={quiet}>
                Rename
              </button>
              <button type="button" onClick={() => setAsking(true)} className={quiet}>
                Ask for a document
              </button>
              {!first && (
                <form action={moveStep}>
                  <H clientId={clientId} id={step.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" aria-label={`Move ${step.title} up`} className={quiet}>
                    Move up
                  </button>
                </form>
              )}
              {!last && (
                <form action={moveStep}>
                  <H clientId={clientId} id={step.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" aria-label={`Move ${step.title} down`} className={quiet}>
                    Move down
                  </button>
                </form>
              )}
              <form action={deleteTask}>
                <H clientId={clientId} id={step.id} />
                <button type="submit" aria-label={`Remove ${step.title}`} className={quiet}>
                  Remove
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Nothing reopens without a yes */}
      {confirm && (
        <div className="ml-[26px] mt-2 rounded-lg border border-[rgba(194,164,107,.6)] bg-white px-3.5 py-3">
          <p className="text-[13px] leading-snug text-lxink">
            Reopen &ldquo;{step.title}&rdquo;? It goes back to open, and {who}&rsquo;s suite shows it open again.
            {agreement ? ` The signed agreement stays in the file, marked Replaced, so you or ${assistantName} can prepare a new one.` : ""}
          </p>
          <div className="mt-2.5 flex items-center gap-4">
            <form action={reopenStep}>
              <H clientId={clientId} id={step.id} />
              <button type="submit" className="rounded-[2px] bg-lxink px-3.5 py-1.5 text-[12.5px] text-white">
                Reopen
              </button>
            </form>
            <button type="button" onClick={() => setConfirm(false)} className="text-[12.5px] text-lxsoft hover:text-lxink">
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
