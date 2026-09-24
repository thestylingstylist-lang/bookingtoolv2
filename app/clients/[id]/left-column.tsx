import {
  addTask,
  toggleTask,
  deleteTask,
  addCollected,
  toggleCollected,
  deleteCollected,
} from "./checklist-actions"

export type Task = { id: string; title: string; done: boolean }
export type Collected = { id: string; title: string; received: boolean }

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-sage"

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
      className="px-1 text-ink/30 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
    >
      &times;
    </button>
  )
}

export default function LeftColumn({
  clientId,
  tasks,
  collected,
}: {
  clientId: string
  tasks: Task[]
  collected: Collected[]
}) {
  return (
    <aside className="space-y-8">
      {/* Tasks */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50">To do for this deal</h2>
        <ul className="mt-3">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-start gap-2 py-1.5">
              <form action={toggleTask}>
                <Hidden clientId={clientId} id={t.id} />
                <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                <button
                  type="submit"
                  aria-label={t.done ? "Mark not done" : "Mark done"}
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border text-[10px] leading-none ${
                    t.done ? "border-sage bg-sage text-white" : "border-ink/30 bg-white"
                  }`}
                >
                  {t.done ? "\u2713" : ""}
                </button>
              </form>
              <span className={`flex-1 text-sm ${t.done ? "text-ink/40 line-through" : ""}`}>
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
          <input name="title" placeholder="Add a task" className={inputClass} />
          <button type="submit" className="rounded-lg border border-ink/20 px-3 text-sm hover:bg-ink/5">
            Add
          </button>
        </form>
      </section>

      {/* Documents collected */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50">Documents collected</h2>
        <ul className="mt-3">
          {collected.map((d) => (
            <li key={d.id} className="group flex items-center gap-2 py-1.5">
              <span className="flex-1 text-sm">{d.title}</span>
              <form action={toggleCollected}>
                <Hidden clientId={clientId} id={d.id} />
                <input type="hidden" name="received" value={d.received ? "0" : "1"} />
                <button
                  type="submit"
                  title={d.received ? "Mark as waiting" : "Mark as received"}
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    d.received ? "bg-sage/15 text-sage" : "bg-brass/15 text-brass"
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
          <button type="submit" className="rounded-lg border border-ink/20 px-3 text-sm hover:bg-ink/5">
            Add
          </button>
        </form>
        <p className="mt-2 text-xs text-ink/40">Tap Waiting to mark it received.</p>
      </section>
    </aside>
  )
}
