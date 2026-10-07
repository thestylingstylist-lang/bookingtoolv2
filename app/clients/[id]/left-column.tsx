import {
  addTask,
  toggleTask,
  deleteTask,
  movePhase,
  addStandardSteps,
  setDueDate,
} from "./checklist-actions"
import { PHASES, phaseIndex, toOwner, type Phase } from "@/lib/phases"
import { agentDueLabel, isClose, canNudge, nudgeDraft, missingThing, daysUntil } from "@/lib/due"
import ReminderBox from "./reminder-box"
import DuePicker from "./due-picker"

export type Task = { id: string; title: string; done: boolean; owner?: string | null; due_on?: string | null; nudged_at?: string | null; phase?: string | null }
export type Collected = { id: string; title: string; received: boolean; file_path?: string | null }

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-[#e4e3e0] bg-white px-3 py-1.5 text-sm outline-none placeholder:text-[#5d5b62] focus:border-sage"

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
      className="px-1 text-[#5d5b62] opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
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
  tz,
  focus,
  nudge,
  canEmail,
  agentFirst,
  missingDocs,
  collected = [],
}: {
  clientId: string
  firstName: string
  phase: Phase
  tasks: Task[]
  tz: string
  focus?: string
  nudge?: string
  canEmail?: boolean
  agentFirst?: string
  missingDocs?: number
  collected?: Collected[]
}) {
  const who = firstName || "Client"
  const i = phaseIndex(phase)
  const current = PHASES[i]
  const next = PHASES[i + 1]
  const prev = PHASES[i - 1]

  return (
    <div className="overflow-hidden rounded-xl border border-[#e6ddce] bg-[#faf7f1]">
      {PHASES.map((p, n) =>
        n === i ? (
      <section key={p.key} className="border-l-[3px] border-[#D9467A] bg-white px-4 pb-5 pt-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-t-[#e6ddce]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">{current.label}</h2>
          <span className="font-[Georgia,serif] text-xs text-[#D9467A]">You&apos;re here</span>
        </div>
        {tasks.length === 0 && (
          <form action={addStandardSteps} className="mt-3">
            <Hidden clientId={clientId} />
            <input type="hidden" name="phase" value={phase} />
            <button
              type="submit"
              className="w-full rounded-lg border border-dashed border-[#c9c7c3] bg-white px-3 py-2.5 text-sm text-[#5d5b62] hover:border-ink hover:text-ink"
            >
              Add the standard {current.label.toLowerCase()} steps
            </button>
          </form>
        )}
        <ul className="mt-3">
          {tasks.map((t) => (
            <li
              key={t.id}
              id={`step-${t.id}`}
              className={`group flex scroll-mt-24 items-start gap-2.5 py-2 ${
                focus === t.id ? "-mx-2 rounded-lg bg-[#fdf3e3] px-2 ring-1 ring-[#e8c98f]" : ""
              }`}
            >
              <form action={toggleTask}>
                <Hidden clientId={clientId} id={t.id} />
                <input type="hidden" name="done" value={t.done ? "0" : "1"} />
                <button
                  type="submit"
                  aria-label={t.done ? "Mark not done" : "Mark done"}
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-[5px] border-[1.5px] text-[10px] leading-none ${
                    t.done ? "border-sage bg-sage text-white" : "border-[#c9c7c3] bg-white"
                  }`}
                >
                  {t.done ? "\u2713" : ""}
                </button>
              </form>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-sm ${t.done ? "text-[#5d5b62] line-through" : ""}`}>{t.title}</span>
                {!t.done && (
                  <form action={setDueDate} className="flex items-center gap-1.5">
                    <Hidden clientId={clientId} id={t.id} />
                    {toOwner(t.owner) === "client" && <span className="text-xs text-[#5d5b62]">{who} ·</span>}
                    <DuePicker
                      submitOnChange
                      value={t.due_on}
                      label={t.due_on ? agentDueLabel(t.due_on, tz) : undefined}
                      empty="Add a due date"
                      strong={!!t.due_on && isClose(t.due_on, tz)}
                      late={!!t.due_on && daysUntil(t.due_on, tz) < 0}
                    />
                  </form>
                )}
                {focus === t.id && nudge === "sent" && (
                  <p className="text-xs text-sage">Reminder sent to {who}.</p>
                )}
                {focus === t.id && nudge === "fail" && (
                  <p className="text-xs text-brass">The reminder didn&apos;t go out. Try again.</p>
                )}
                {!t.done && t.due_on && toOwner(t.owner) === "client" && canNudge(t.due_on, t.nudged_at, tz) && (
                  canEmail ? (
                    <ReminderBox
                      stepId={t.id}
                      who={who}
                      agentFirst={agentFirst}
                      open={focus === t.id && nudge !== "sent"}
                      fallback={nudgeDraft({
                        clientFirst: firstName,
                        thing: missingThing(t.title),
                        due: t.due_on,
                        tz,
                        agentFirst: agentFirst ?? "",
                        missingDocs: /document/i.test(t.title) ? missingDocs ?? 0 : 0,
                        phase: t.phase ?? phase,
                      })}
                    />
                  ) : (
                    <p className="text-xs text-[#5d5b62]">Add an email for {who} to send a reminder.</p>
                  )
                )}
              </div>
              <form action={deleteTask}>
                <Hidden clientId={clientId} id={t.id} />
                <RemoveButton label={t.title} />
              </form>
            </li>
          ))}
        </ul>
        <form action={addTask} className="mt-2 space-y-2">
          <Hidden clientId={clientId} />
          <input type="hidden" name="phase" value={phase} />
          <div className="flex gap-2">
            <input name="title" placeholder="Add a step" aria-label="Step" className={inputClass} />
            <button type="submit" className="rounded-lg border border-[#e4e3e0] bg-white px-3 text-sm hover:bg-[#f1f0ee]">
              Add
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[#5d5b62]">
              For
              <select name="owner" className="rounded-md border border-[#e4e3e0] bg-white px-1.5 py-0.5 text-xs text-ink">
                <option value="agent">Me</option>
                <option value="client">{who}</option>
              </select>
            </label>
            <DuePicker empty="When do you want it by?" />
          </div>
        </form>

        {collected.length > 0 && (
          <div className="mt-5 border-t border-[#ece6da] pt-4">
            <p className="font-[Georgia,serif] text-xs italic text-[#8a8072]">In the folder</p>
            <ul className="mt-2 space-y-1.5">
              {collected.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{d.title}</span>
                  <span className={`shrink-0 text-xs ${d.received ? "text-[#4f6b45]" : "text-[#c23d6d]"}`}>
                    {d.received ? "Received" : "Waiting"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {next && (
          <form action={movePhase} className="mt-5">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={next.key} />
            <button
              type="submit"
              className="w-full rounded-[10px] bg-ox px-3 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Move to {next.label}
            </button>
          </form>
        )}
        {prev && (
          <form action={movePhase} className="mt-2 text-center">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={prev.key} />
            <button type="submit" className="text-xs text-[#5d5b62] underline underline-offset-2 hover:text-ink">
              Back to {prev.label}
            </button>
          </form>
        )}
      </section>
        ) : (
          <div
            key={p.key}
            className="flex items-baseline justify-between px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[#e6ddce]"
          >
            <span className="text-sm text-[#4a433b]">{p.label}</span>
            <span className="font-[Georgia,serif] text-xs text-[#8a8072]">{n < i ? "Done" : n === i + 1 ? "Up next" : "Later"}</span>
          </div>
        )
      )}
    </div>
  )
}
