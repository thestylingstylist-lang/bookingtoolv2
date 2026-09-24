import { saveDeal, addOffer, deleteOffer, addNote, deleteNote } from "./panel-actions"

export type Offer = {
  id: string
  property_address: string
  amount: number | null
  other_agent_name: string | null
  other_agent_email: string | null
}
export type Note = { id: string; body: string; created_at: string }

const inputClass =
  "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sage"
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function Remove({ action, clientId, id, label }: {
  action: (fd: FormData) => Promise<void>
  clientId: string
  id: string
  label: string
}) {
  return (
    <form action={action}>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Remove ${label}`}
        className="px-1 text-ink/30 opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
      >
        &times;
      </button>
    </form>
  )
}

export default function DealPanel({
  clientId,
  clientType,
  budgetMin,
  budgetMax,
  offers,
  notes,
  timezone,
}: {
  clientId: string
  clientType: string | null
  budgetMin: number | null
  budgetMax: number | null
  offers: Offer[]
  notes: Note[]
  timezone: string
}) {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="mt-6 space-y-8">
      {/* Type + buying range */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50">Deal</h2>
        <form action={saveDeal} className="mt-3 space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          <select name="clientType" defaultValue={clientType ?? ""} className={inputClass}>
            <option value="">Buyer or seller?</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Buyer and seller</option>
          </select>
          <div>
            <label className="mb-1 block text-xs text-ink/50">Buying range</label>
            <div className="flex items-center gap-2">
              <input
                name="budgetMin"
                inputMode="numeric"
                placeholder="Min"
                defaultValue={budgetMin != null ? usd.format(budgetMin) : ""}
                className={inputClass}
              />
              <span className="text-ink/40">&ndash;</span>
              <input
                name="budgetMax"
                inputMode="numeric"
                placeholder="Max"
                defaultValue={budgetMax != null ? usd.format(budgetMax) : ""}
                className={inputClass}
              />
            </div>
          </div>
          <button type="submit" className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5">
            Save
          </button>
        </form>
      </section>

      {/* Offers */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50">Offers</h2>
        {offers.length === 0 && <p className="mt-3 text-sm text-ink/40">No offers yet.</p>}
        <ul className="mt-3 space-y-3">
          {offers.map((o) => (
            <li key={o.id} className="group flex items-start gap-2 border-b border-ink/5 pb-3">
              <div className="flex-1 text-sm">
                <p className="font-medium">{o.property_address}</p>
                {o.amount != null && <p className="mt-0.5">{usd.format(o.amount)}</p>}
                {(o.other_agent_name || o.other_agent_email) && (
                  <p className="mt-1 text-xs text-ink/50">
                    Buyer/Selling Agent: {[o.other_agent_name, o.other_agent_email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <Remove action={deleteOffer} clientId={clientId} id={o.id} label={o.property_address} />
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-sage">+ Add an offer</summary>
          <form action={addOffer} className="mt-3 space-y-2">
            <input type="hidden" name="clientId" value={clientId} />
            <input name="address" required placeholder="Property address" className={inputClass} />
            <input name="amount" inputMode="numeric" placeholder="Offer amount" className={inputClass} />
            <input name="agentName" placeholder="Buyer/Selling Agent name" className={inputClass} />
            <input name="agentEmail" type="email" placeholder="Buyer/Selling Agent email" className={inputClass} />
            <button type="submit" className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5">
              Save offer
            </button>
          </form>
        </details>
      </section>

      {/* Notes */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-ink/50">Notes</h2>
        <form action={addNote} className="mt-3 space-y-2">
          <input type="hidden" name="clientId" value={clientId} />
          <textarea name="body" rows={2} placeholder="Add a note" className={inputClass + " resize-none"} />
          <button type="submit" className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm hover:bg-ink/5">
            Add note
          </button>
        </form>
        <ul className="mt-4 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-2 rounded-lg bg-ink/[0.03] p-3">
              <div className="flex-1">
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-ink/40">{day.format(new Date(n.created_at))}</p>
              </div>
              <Remove action={deleteNote} clientId={clientId} id={n.id} label="note" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
