import {
  addTask,
  movePhase,
  addStandardSteps,
  setDueDate,
} from "./checklist-actions"
import { phasesFor, journeyOf, stageLabel, phaseIndex, toOwner, type Phase } from "@/lib/phases"
import { agentDueLabel, isClose, canNudge, nudgeDraft, missingThing, daysUntil } from "@/lib/due"
import ReminderBox from "./reminder-box"
import StepRow from "./step-row"
import DuePicker from "./due-picker"

export type Task = { id: string; title: string; done: boolean; owner?: string | null; due_on?: string | null; nudged_at?: string | null; phase?: string | null }
export type Collected = { id: string; title: string; received: boolean; file_path?: string | null; stepId?: string | null }

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-lxhair bg-white px-3 py-1.5 text-sm outline-none placeholder:text-lxsoft focus:border-lxgold"

function Hidden({ clientId, id }: { clientId: string; id?: string }) {
  return (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      {id && <input type="hidden" name="id" value={id} />}
    </>
  )
}

export default function LeftColumn({
  clientId,
  firstName,
  phase,
  tasks,
  allTasks,
  tz,
  focus,
  nudge,
  canEmail,
  agentFirst,
  missingDocs,
  collected = [],
  assistant = false,
  assistantName = "Diana",
  privateShowings = false,
  suite,
  heading,
  children,
}: {
  clientId: string
  firstName: string
  phase: Phase
  tasks: Task[]
  allTasks?: Task[] // every stage's steps for this journey, so finished stages can be reopened
  tz: string
  focus?: string
  nudge?: string
  canEmail?: boolean
  agentFirst?: string
  missingDocs?: number
  collected?: Collected[]
  assistant?: boolean
  assistantName?: string
  privateShowings?: boolean
  suite?: string
  heading?: string
  children?: React.ReactNode
}) {
  const who = firstName || "Client"
  const i = phaseIndex(phase)
  const PHASES = (phasesFor(journeyOf(phase)) as { key: Phase; label: string }[]).map((p) => ({
    key: p.key,
    label: stageLabel(p.key, privateShowings),
  }))
  const current = PHASES[i]
  const next = PHASES[i + 1]
  const prev = PHASES[i - 1]
  const hasStandard = (phasesFor(journeyOf(phase)) as { key: Phase; steps: unknown[] }[])[i]?.steps.length > 0

  return (
    <div>
    {heading && <h2 className="mb-2 mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-lxsoft">{heading}</h2>}
    <div className="overflow-hidden rounded-xl border border-lxhair bg-lxfill">
      {PHASES.map((p, n) =>
        n === i ? (
      <section key={p.key} className="border-l-[3px] border-lxgold bg-white px-4 pb-5 pt-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-t-[#e4e3e0]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-lxink">{current.label}</h2>
          <span className="font-semibold tracking-tight text-xs text-lxgolddeep">You&apos;re here</span>
        </div>
        {tasks.length === 0 && hasStandard && (
          <form action={addStandardSteps} className="mt-3">
            <Hidden clientId={clientId} />
            <input type="hidden" name="phase" value={phase} />
            <button
              type="submit"
              className="w-full rounded-lg border border-dashed border-lxhair bg-white px-3 py-2.5 text-sm text-lxsoft hover:border-lxink hover:text-lxink"
            >
              Add the usual {current.label} steps
            </button>
          </form>
        )}
        <ul className="mt-3">
          {tasks.map((t, n) => (
            <StepRow
              key={t.id}
              clientId={clientId}
              step={t}
              who={who}
              first={n === 0}
              last={n === tasks.length - 1}
              focus={focus === t.id}
              docs={collected.filter((d) => d.stepId === t.id)}
              assistantName={assistantName}
            >
                {!t.done && (
                  <form action={setDueDate} className="flex items-center gap-1.5">
                    <Hidden clientId={clientId} id={t.id} />
                    {toOwner(t.owner) === "client" && <span className="text-xs text-lxsoft">{who} ·</span>}
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
                  <p className="text-xs text-lxgold">Reminder sent to {who}.</p>
                )}
                {focus === t.id && nudge === "fail" && (
                  <p className="text-xs text-lxink">That reminder didn&apos;t go out. Try again in a moment.</p>
                )}
                {!t.done && t.due_on && toOwner(t.owner) === "client" && canNudge(t.due_on, t.nudged_at, tz) && (
                  canEmail ? (
                    <ReminderBox
                      stepId={t.id}
                      who={who}
                      agentFirst={agentFirst}
                      assistant={assistant}
                      assistantName={assistantName}
                      open={focus === t.id && nudge !== "sent"}
                      fallback={nudgeDraft({
                        clientFirst: firstName,
                        thing: missingThing(t.title),
                        due: t.due_on,
                        tz,
                        agentFirst: agentFirst ?? "",
                        missingDocs: /document/i.test(t.title) ? missingDocs ?? 0 : 0,
                        phase: t.phase ?? phase,
                        suite,
                      })}
                    />
                  ) : (
                    <p className="text-xs text-lxsoft">Add an email for {who} to send a reminder.</p>
                  )
                )}
            </StepRow>
          ))}
        </ul>
        {children}
        <form action={addTask} className="mt-2 space-y-2">
          <Hidden clientId={clientId} />
          <input type="hidden" name="phase" value={phase} />
          <div className="flex gap-2">
            <input name="title" placeholder="Add a step" aria-label="Step" className={inputClass} />
            <button type="submit" className="rounded-lg border border-lxhair bg-white px-3 text-sm hover:bg-lxfill">
              Add
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-lxsoft">
              For
              <select name="owner" className="rounded-md border border-lxhair bg-white px-1.5 py-0.5 text-xs text-lxink">
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
              className="w-full rounded-[10px] bg-lxink px-3 py-2.5 text-sm font-medium text-lxbg transition-opacity hover:opacity-90"
            >
              Move to {next.label}
            </button>
          </form>
        )}
        {prev && (
          <form action={movePhase} className="mt-2 text-center">
            <Hidden clientId={clientId} />
            <input type="hidden" name="to" value={prev.key} />
            <button type="submit" className="text-xs text-lxsoft underline underline-offset-2 hover:text-lxink">
              Back to {prev.label}
            </button>
          </form>
        )}
      </section>
        ) : (
          (() => {
            const stageSteps = (allTasks ?? []).filter((t) => (t.phase ?? "showing") === p.key)
            const status = n < i ? "Done" : n === i + 1 ? "Up next" : "Later"
            if (!stageSteps.length)
              return (
                <div key={p.key} className="flex items-baseline justify-between px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-lxhair">
                  <span className="text-sm text-lxsoft">{p.label}</span>
                  <span className="font-semibold tracking-tight text-xs text-[#8f8b84]">{status}</span>
                </div>
              )
            // A finished or later stage opens to show its steps, so any of them can be reopened or changed.
            return (
              <details key={p.key} open={stageSteps.some((t) => t.id === focus)} className="group/stage px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-lxhair">
                <summary className="flex cursor-pointer list-none items-baseline justify-between [&::-webkit-details-marker]:hidden">
                  <span className="text-sm text-lxsoft">{p.label}</span>
                  <span className="flex items-baseline gap-2 text-xs">
                    <span className="font-semibold tracking-tight text-[#8f8b84]">{status}</span>
                    <span className="text-lxsoft group-open/stage:hidden">Show</span>
                    <span className="hidden text-lxsoft group-open/stage:inline">Hide</span>
                  </span>
                </summary>
                <ul className="mt-2">
                  {stageSteps.map((t, k) => (
                    <StepRow
                      key={t.id}
                      clientId={clientId}
                      step={t}
                      who={who}
                      first={k === 0}
                      last={k === stageSteps.length - 1}
                      focus={focus === t.id}
                      docs={collected.filter((d) => d.stepId === t.id)}
                      assistantName={assistantName}
                    />
                  ))}
                </ul>
              </details>
            )
          })()
        )
      )}
    </div>
    </div>
  )
}
