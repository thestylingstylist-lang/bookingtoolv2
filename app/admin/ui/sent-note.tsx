// The confirmation under a send button: what went out, to whom, and when.
export function sentTime(at?: string) {
  const n = Number(at)
  if (!at || !Number.isFinite(n)) return ""
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(n))
}

export default function SentNote({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-[#e7f3ea] text-[#1f5b33]" : "bg-[#fbe9ef] text-[#9b2c52]"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      {children}
    </p>
  )
}
