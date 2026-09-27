import {
  addCollected,
  toggleCollected,
  deleteCollected,
} from "./checklist-actions"

export type Collected = { id: string; title: string; received: boolean; file_path?: string | null }

const inputClass =
  "min-w-0 flex-1 rounded-lg border border-[#e4e3e0] bg-white px-3 py-1.5 text-sm outline-none placeholder:text-[#5d5b62] focus:border-sage"

export default function DocumentsPanel({
  clientId,
  collected,
}: {
  clientId: string
  collected: Collected[]
}) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.08em] text-[#5d5b62]">Documents collected</h2>
      <ul className="mt-3">
        {collected.map((d) => (
          <li key={d.id} className="group flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1 text-sm">{d.title}</span>
            {d.file_path && (
              <a
                href={`/clients/${clientId}/file/${d.id}`}
                target="_blank"
                rel="noopener"
                className="shrink-0 whitespace-nowrap text-[11px] text-sage underline-offset-2 hover:underline"
              >
                View
              </a>
            )}
            {d.file_path && (
              <a
                href={`/clients/${clientId}/file/${d.id}?download=1`}
                title="Download"
                aria-label={`Download ${d.title}`}
                className="shrink-0 text-sage hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v11" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 20h14" />
                </svg>
              </a>
            )}
            <form action={toggleCollected}>
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="received" value={d.received ? "0" : "1"} />
              <button
                type="submit"
                title={d.received ? "Mark as waiting" : "Mark as received"}
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                  d.received ? "bg-[#e5f1f0] text-sage" : "bg-[#f8e6ec] text-brass"
                }`}
              >
                {d.received ? "Received" : "Waiting"}
              </button>
            </form>
            <form action={deleteCollected}>
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="id" value={d.id} />
              <button type="submit" aria-label={`Remove ${d.title}`} className="px-1 text-[#5d5b62] opacity-0 transition-opacity hover:text-ink group-hover:opacity-100">&times;</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={addCollected} className="mt-2 flex gap-2">
        <input type="hidden" name="clientId" value={clientId} />
        <input name="title" placeholder="e.g. Pay stubs" className={inputClass} />
        <button type="submit" className="rounded-lg border border-[#e4e3e0] bg-white px-3 text-sm hover:bg-[#f1f0ee]">Add</button>
      </form>
      <p className="mt-2 text-xs text-[#5d5b62]">Clients can upload these from their portal, or tap Waiting to mark one received.</p>
    </section>
  )
}
