import {
  saveSaleHome,
  setPrivateShowings,
  addOpenHouse,
  saveFeedback,
  deleteOpenHouse,
  addSaleOffer,
  updateSaleOffer,
  deleteSaleOffer,
} from "./seller-actions"

export type OpenHouse = { id: string; starts_at: string; ends_at: string | null; kind: string; feedback: string | null }
export type SaleOffer = { id: string; amount: number; terms: string | null; status: string; note: string | null; received_on: string | null }
export type SaleHome = { address: string | null; price: number | null; listedOn: string | null; url: string | null }

const input =
  "w-full min-w-0 rounded-lg border border-lxhair bg-white px-3 py-1.5 text-sm outline-none placeholder:text-lxsoft focus:border-lxgold"
const small = "text-[11px] uppercase tracking-[0.05em] text-lxsoft"
const btn = "rounded-lg border border-lxhair bg-white px-3 py-1.5 text-sm hover:bg-lxfill"

const STATUS_LABEL: Record<string, string> = {
  review: "Under review",
  countered: "Countered",
  accepted: "Accepted",
  declined: "Declined",
}

// The agent's side of a seller: their home, open houses or private showings
// with a note after each, and every offer that comes in.
export default function SellerTools({
  clientId,
  firstName,
  home,
  privateShowings,
  openHouses,
  offers,
  tz,
}: {
  clientId: string
  firstName: string
  home: SaleHome
  privateShowings: boolean
  openHouses: OpenHouse[]
  offers: SaleOffer[]
  tz: string
}) {
  const who = firstName || "your client"
  const when = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  const endFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })
  const hidden = <input type="hidden" name="clientId" value={clientId} />

  return (
    <div className="mt-4 space-y-4">
      {/* Their home */}
      <section className="rounded-xl border border-lxhair bg-white px-4 py-4">
        <h3 className="text-sm font-semibold">{firstName ? `${firstName}’s home` : "Their home"}</h3>
        <p className="mt-0.5 text-xs text-lxsoft">Shown at the top of {who}&rsquo;s seller suite.</p>
        <form action={saveSaleHome} className="mt-3 grid gap-2 sm:grid-cols-2">
          {hidden}
          <label className="sm:col-span-2">
            <span className={small}>Address</span>
            <input name="address" defaultValue={home.address ?? ""} placeholder="31 Linden Court, Far Hills, NJ" className={input} />
          </label>
          <label>
            <span className={small}>Listed at</span>
            <input name="price" inputMode="numeric" defaultValue={home.price ? `$${Math.round(home.price).toLocaleString("en-US")}` : ""} placeholder="$3,450,000" className={input} />
          </label>
          <label>
            <span className={small}>On the market since</span>
            <input name="listedOn" type="date" defaultValue={home.listedOn ?? ""} className={input} />
          </label>
          <label className="sm:col-span-2">
            <span className={small}>Listing link</span>
            <input name="url" type="url" defaultValue={home.url ?? ""} placeholder="https://" className={input} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={btn}>Save</button>
          </div>
        </form>
      </section>

      {/* Open houses or private showings */}
      <section className="rounded-xl border border-lxhair bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{privateShowings ? "Private showings" : "Open houses"}</h3>
            <p className="mt-0.5 text-xs text-lxsoft">
              {privateShowings
                ? "Vetted buyers only. Your client sees this stage as Private showings."
                : "Dates and times your client sees. Add a short note after each one."}
            </p>
          </div>
          <form action={setPrivateShowings}>
            {hidden}
            <input type="hidden" name="on" value={privateShowings ? "0" : "1"} />
            <button
              type="submit"
              role="switch"
              aria-checked={privateShowings}
              className="flex items-center gap-2 whitespace-nowrap text-xs text-lxsoft"
            >
              <span className={`relative h-5 w-9 rounded-full transition-colors ${privateShowings ? "bg-lxink" : "bg-[#d6d4d0]"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${privateShowings ? "left-[18px]" : "left-0.5"}`} />
              </span>
              Private showings
            </button>
          </form>
        </div>

        <ul className="mt-3 divide-y divide-lxhair">
          {openHouses.map((o) => (
            <li key={o.id} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">
                  {when.format(new Date(o.starts_at))}
                  {o.ends_at ? ` to ${endFmt.format(new Date(o.ends_at))}` : ""}
                </span>
                <span className="flex items-center gap-2 text-xs text-lxsoft">
                  {o.kind === "private" ? "Private showing" : "Open house"}
                  <form action={deleteOpenHouse}>
                    {hidden}
                    <input type="hidden" name="id" value={o.id} />
                    <button type="submit" aria-label="Remove" className="px-1 hover:text-lxink">&times;</button>
                  </form>
                </span>
              </div>
              <form action={saveFeedback} className="mt-2 flex gap-2">
                {hidden}
                <input type="hidden" name="id" value={o.id} />
                <textarea
                  name="feedback"
                  rows={2}
                  defaultValue={o.feedback ?? ""}
                  placeholder="What buyers said"
                  className={`${input} resize-y`}
                />
                <button type="submit" className={`${btn} self-start`}>Save</button>
              </form>
            </li>
          ))}
        </ul>

        <form action={addOpenHouse} className="mt-3 flex flex-wrap items-end gap-2">
          {hidden}
          <input type="hidden" name="kind" value={privateShowings ? "private" : "open_house"} />
          <label>
            <span className={small}>Date</span>
            <input name="date" type="date" required className={input} />
          </label>
          <label>
            <span className={small}>From</span>
            <input name="start" type="time" required className={input} />
          </label>
          <label>
            <span className={small}>To</span>
            <input name="end" type="time" className={input} />
          </label>
          <button type="submit" className={btn}>Add {privateShowings ? "showing" : "open house"}</button>
        </form>
      </section>

      {/* Offers received */}
      <section className="rounded-xl border border-lxhair bg-white px-4 py-4">
        <h3 className="text-sm font-semibold">Offers received</h3>
        <p className="mt-0.5 text-xs text-lxsoft">Each offer, where it stands, and your note. {firstName || "Your client"} sees all three.</p>
        <ul className="mt-3 divide-y divide-lxhair">
          {offers.map((o) => (
            <li key={o.id} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">${Math.round(Number(o.amount)).toLocaleString("en-US")}</span>
                <form action={deleteSaleOffer}>
                  {hidden}
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" aria-label="Remove" className="px-1 text-xs text-lxsoft hover:text-lxink">&times;</button>
                </form>
              </div>
              {(o.terms || o.received_on) && (
                <p className="text-xs text-lxsoft">
                  {[o.terms, o.received_on ? `Received ${o.received_on}` : ""].filter(Boolean).join(" · ")}
                </p>
              )}
              <form action={updateSaleOffer} className="mt-2 space-y-2">
                {hidden}
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className={input}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <textarea name="note" rows={2} defaultValue={o.note ?? ""} placeholder="Your note on this offer" className={`${input} resize-y`} />
                <button type="submit" className={btn}>Save</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addSaleOffer} className="mt-3 grid gap-2 sm:grid-cols-2">
          {hidden}
          <label>
            <span className={small}>Amount</span>
            <input name="amount" inputMode="numeric" required placeholder="$3,420,000" className={input} />
          </label>
          <label>
            <span className={small}>Received</span>
            <input name="receivedOn" type="date" className={input} />
          </label>
          <label className="sm:col-span-2">
            <span className={small}>Terms</span>
            <input name="terms" placeholder="Cash, closing in 30 days" className={input} />
          </label>
          <label className="sm:col-span-2">
            <span className={small}>Your note</span>
            <textarea name="note" rows={2} placeholder="What you think of it" className={`${input} resize-y`} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={btn}>Add offer</button>
          </div>
        </form>
      </section>
    </div>
  )
}
