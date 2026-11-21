// Shared pieces of the client-facing suite look: the agent's header, the stage
// tracker, tags and buttons. Signature white, fine gold lines, thin serif
// headings, small sans body. Server-safe (no client hooks).

export const LINE = "border-[rgba(194,164,107,.55)]"
export const HAIR = "border-[rgba(31,30,28,.09)]"

export const BTN =
  "inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-lxink bg-lxink px-[22px] font-luxsans text-[13px] tracking-[.3px] text-lxbg transition-opacity hover:opacity-90 disabled:opacity-60"
export const OUTLINE =
  "inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-lxink bg-transparent px-[22px] font-luxsans text-[13px] tracking-[.3px] text-lxink transition-colors hover:bg-[rgba(31,30,28,.04)] disabled:opacity-60"
export const QUIET =
  "inline-flex min-h-[44px] items-center border-0 border-b border-lxgold bg-transparent p-0 font-luxsans text-[13px] text-lxink disabled:opacity-60"
export const QUIET_SM = "border-0 border-b border-lxgold text-lxink no-underline"

export type TagColor = "blue" | "sage" | "lav" | "blush"
const TAG_BG: Record<TagColor, string> = { blue: "bg-lxblue", sage: "bg-lxsage", lav: "bg-lxlav", blush: "bg-lxblush" }

export function Tag({ color, children }: { color: TagColor; children: React.ReactNode }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-[3px] font-luxsans text-[11px] text-lxink ${TAG_BG[color]}`}>
      {children}
    </span>
  )
}

export function DotLabel({ color, children }: { color: TagColor; children: React.ReactNode }) {
  return (
    <p className="m-0 flex items-center gap-2 font-luxsans text-[11.5px] tracking-[.4px] text-lxsoft">
      <span className={`h-1.5 w-1.5 rounded-full ${TAG_BG[color]}`} />
      {children}
    </p>
  )
}

export function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`m-0 font-lux text-[24px] font-normal tracking-[.2px] text-lxink ${className}`}>{children}</h2>
}

export function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase() || "?"
  )
}

// The agent leads: monogram, name and brokerage over a fine gold line.
export function AgentHeader({ name, brokerage, prefix = "" }: { name: string; brokerage?: string | null; prefix?: string }) {
  return (
    <header className={`flex items-center gap-3.5 border-b ${LINE} pb-[18px]`}>
      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-lxgold font-lux text-[14px] tracking-[1px] text-lxink md:h-11 md:w-11 md:text-[16px]">
        {initialsOf(name)}
      </div>
      <div className="min-w-0">
        <p className="m-0 font-lux text-[18px] font-medium tracking-[.3px] text-lxink md:text-[20px]">
          {prefix}
          {name}
        </p>
        {brokerage && brokerage !== name && <p className="m-0 mt-0.5 font-luxsans text-[12px] text-lxsoft">{brokerage}</p>}
      </div>
    </header>
  )
}

// Marvberry stays quiet: a small monogram and one line.
export function SuiteFooter() {
  return (
    <footer className="flex items-center justify-center gap-2 pb-6 pt-7">
      <span className="font-lux text-[14px] italic text-lxgold">mb</span>
      <span className="font-luxsans text-[10.5px] tracking-[.4px] text-lxsoft">powered by marvberry</span>
    </footer>
  )
}

// Stages along a fine line. Done: a gold dot. Now: a gold ring. Later: hollow.
// On a phone the labels give way to the current stage and "Stage 3 of 6".
export function Tracker({ labels, current }: { labels: string[]; current: number }) {
  const n = labels.length
  return (
    <div>
      <div className="flex items-start gap-2 md:gap-3">
        {labels.map((l, i) => (
          <div key={l + i} className="contents">
            <div
              className={`flex shrink-0 flex-col gap-2.5 ${i === 0 ? "items-start" : i === n - 1 ? "items-end" : "items-center"}`}
            >
              <div className="flex h-[13px] items-center">
                {i < current ? (
                  <span className="h-[7px] w-[7px] rounded-full bg-lxgold" />
                ) : i === current ? (
                  <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full border border-lxgold">
                    <span className="h-[5px] w-[5px] rounded-full bg-lxgold" />
                  </span>
                ) : (
                  <span className="h-[7px] w-[7px] rounded-full border border-[rgba(31,30,28,.3)]" />
                )}
              </div>
              <span
                className={`hidden whitespace-nowrap font-lux text-[17px] md:block ${
                  i === current ? "italic text-lxink" : "text-lxsoft"
                }`}
              >
                {l}
              </span>
            </div>
            {i < n - 1 && (
              <div className={`mt-1.5 h-px flex-1 ${i < current ? "bg-lxgold" : "bg-[rgba(31,30,28,.15)]"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 flex items-baseline justify-between font-luxsans text-[12px] text-lxsoft md:hidden">
        <span className="font-lux text-[18px] italic text-lxink">{labels[current]}</span>
        <span>
          Stage {current + 1} of {n}
        </span>
      </p>
    </div>
  )
}
