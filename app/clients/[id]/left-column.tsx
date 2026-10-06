import {
  addTask,
  toggleTask,
  deleteTask,
  movePhase,
  addStandardSteps,
  setDueDate,
} from "./checklist-actions"
import { PHASES, phaseIndex, toOwner, type Phase } from "@/lib/phases"
import { agentDueLabel, isClose, canNudge, nudgeDraft, missingThing } from "@/lib/due"
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
}) {
  const who = firstName || "Client"
  const i = phaseIndex(phase)
  const current = PHASES[i]
  const next = PHASES[i + 1]
  const prev = PHASES[i - 1]
  const upNext = tasks.find((t) => !t.done)

  return (
    <div className="space-y-8">
      {/* Right now */}
      {tasks.length > 0 && (
        <div className="rounded-xl border border-[#e4e3e0] bg-white p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#16151a]">Right now</p>
          <p className="mt-1 text-sm leading-snug">
            {upNext
              ? upNext.title
              : next
                ? `${current.label} is done. Move ${firstName || "them"} to ${next.label} when you're ready.`
                : "Every step is done."}
          </p>
          {upNext?.due_on && (
            <p className={`mt-1 text-xs ${isClose(upNext.due_on, tz) ? "font-medium text-ink" : "text-[#5d5b62]"}`}>
              {agentDueLabel(upNext.due_on, tz)}
            </p>
          )}
        </div>
      )}

      {/* Checklist for the current phase */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.08em] text-[#5d5b62]">{current.label} checklist</h2>
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

        {next && (
          <form action={movePhase} className="mt-5">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={next.key} />
            <button
              type="submit"
              className="w-full rounded-[10px] bg-ox px-3 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90"
            >
              Move to {next.label} &rarr;
            </button>
          </form>
        )}
        {prev && (
          <form action={movePhase} className="mt-2 text-center">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={prev.key} />
            <button type="submit" className="text-xs text-[#5d5b62] hover:text-ink">
              &larr; Back to {prev.label}
            </button>
          </form>
        )}
      </section>

    </div>
  )
}
