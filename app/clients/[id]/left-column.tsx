import {
  addTask,
  toggleTask,
  deleteTask,
  addCollected,
  toggleCollected,
  deleteCollected,
  movePhase,
  addStandardSteps,
} from "./checklist-actions"
import { PHASES, phaseIndex, type Phase } from "@/lib/phases"

export type Task = { id: string; title: string; done: boolean }
export type Collected = { id: string; title: string; received: boolean; file_path?: string | null }

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-[#ecebe6] bg-white px-3 py-1.5 text-sm outline-none placeholder:text-[#8c8a83] focus:border-sage"

function Hidden({ clientId, id }: { clientId: string; id?: string }) {
  return (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      {id && <input type="hidden" name="id" value={id} />}
    </>
  )
}

function RemoveButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      aria-label={`Remove ${label}`}
      className="px-1 text-[#8c8a83] opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
    >
      &times;
    </button>
  )
}

export default function LeftColumn({
  clientId,
  firstName,
  phase,
  tasks,
  collected,
}: {
  clientId: string
  firstName: string
  phase: Phase
  tasks: Task[]
  collected: Collected[]
}) {
  const i = phaseIndex(phase)
  const current = PHASES[i]
  const next = PHASES[i + 1]
  const prev = PHASES[i - 1]
  const upNext = tasks.find((t) => !t.done)

  return (
    <div className="space-y-8">
      {/* Right now */}
      {tasks.length > 0 && (
        <div className="rounded-xl border border-[#ecebe6] bg-white p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b08477]">Right now</p>
          <p className="mt-1 text-sm leading-snug">
            {upNext
              ? upNext.title
              : next
                ? `${current.label} is done. Move ${firstName || "them"} to ${next.label} when you're ready.`
                : "Every step is done."}
          </p>
        </div>
      )}

      {/* Checklist for the current phase */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.08em] text-[#8c8a83]">{current.label} checklist</h2>
        {tasks.length === 0 && (
          <form action={addStandardSteps} className="mt-3">
            <Hidden clientId={clientId} />
            <input type="hidden" name="phase" value={phase} />
            <button
              type="submit"
              className="w-full rounded-lg border border-dashed border-[#c9c7c0] bg-white px-3 py-2.5 text-sm text-[#8c8a83] hover:border-ink hover:text-ink"
            >
              Add the standard {current.label.toLowerCase()} steps
            </button>
          </form>
        )}
        <ul className="mt-3">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-start gap-2.5 py-2">
              <form action={toggleTask}>
                <Hidden clientId={clientId} id={t.id} />
                <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                <button
                  type="submit"
                  aria-label={t.done ? "Mark not done" : "Mark done"}
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-[5px] border-[1.5px] text-[10px] leading-none ${
                    t.done ? "border-sage bg-sage text-white" : "border-[#c9c7c0] bg-white"
                  }`}
                >
                  {t.done ? "\u2713" : ""}
                </button>
              </form>
              <span className={`flex-1 text-sm ${t.done ? "text-[#8c8a83] line-through" : ""}`}>
                {t.title}
              </span>
              <form action={deleteTask}>
                <Hidden clientId={clientId} id={t.id} />
                <RemoveButton label={t.title} />
              </form>
            </li>
          ))}
        </ul>
        <form action={addTask} className="mt-2 flex gap-2">
          <Hidden clientId={clientId} />
          <input type="hidden" name="phase" value={phase} />
          <input name="title" placeholder="Add a step" className={inputClass} />
          <button type="submit" className="rounded-lg border border-[#ecebe6] bg-white px-3 text-sm hover:bg-[#f4f3f0]">
            Add
          </button>
        </form>

        {next && (
          <form action={movePhase} className="mt-5">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={next.key} />
            <button
              type="submit"
              className="w-full rounded-[10px] bg-ink px-3 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Move to {next.label} &rarr;
            </button>
          </form>
        )}
        {prev && (
          <form action={movePhase} className="mt-2 text-center">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={prev.key} />
            <button type="submit" className="text-xs text-[#8c8a83] hover:text-ink">
              &larr; Back to {prev.label}
            </button>
          </form>
        )}
      </section>

      {/* Documents collected */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.08em] text-[#8c8a83]">Documents collected</h2>
        <ul className="mt-3">
          {collected.map((d) => (
            <li key={d.id} className="group flex items-center gap-2 py-2">
              <span className="flex-1 text-sm">{d.title}</span>
              {d.file_path && (
                <a
                  href={`/clients/${clientId}/file/${d.id}`}
                  target="_blank"
                  rel="noopener"
                  className="text-[11px] text-sage underline-offset-2 hover:underline"
                >
                  View
                </a>
              )}
              <form action={toggleCollected}>
                <Hidden clientId={clientId} id={d.id} />
                <input type="hidden" name="received" value={d.received ? "0" : "1"} />
                <button
                  type="submit"
                  title={d.received ? "Mark as waiting" : "Mark as received"}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                    d.received ? "bg-[#e4ece7] text-sage" : "bg-[#f0e7d6] text-brass"
                  }`}
                >
                  {d.received ? "Received" : "Waiting"}
                </button>
              </form>
              <form action={deleteCollected}>
                <Hidden clientId={clientId} id={d.id} />
                <RemoveButton label={d.title} />
              </form>
            </li>
          ))}
        </ul>
        <form action={addCollected} className="mt-2 flex gap-2">
          <Hidden clientId={clientId} />
          <input name="title" placeholder="e.g. Pay stubs" className={inputClass} />
          <button type="submit" className="rounded-lg border border-[#ecebe6] bg-white px-3 text-sm hover:bg-[#f4f3f0]">
            Add
          </button>
        </form>
        <p className="mt-2 text-xs text-[#8c8a83]">Clients can upload these from their portal, or tap Waiting to mark one received.</p>
      </section>
    </div>
  )
}
