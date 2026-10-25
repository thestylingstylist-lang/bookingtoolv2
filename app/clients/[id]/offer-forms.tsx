"use client"

import { useActionState, useEffect, useState } from "react"
import { sendOffer, followUpOffer, type HomeResult } from "./homes-actions"

export type DocView = { id: string; title: string }
export type OfferView = {
  id: string
  amount: string
  sentLabel: string
  goodLabel: string
  status: "sent" | "countered" | "accepted" | "declined"
  soon: boolean
  followedUp: boolean
}

const input =
  "w-full rounded-xl border border-[#dddcd9] bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
const label = "mb-1.5 block text-[12.5px] text-[#5d5b62]"
const section = "mb-3 flex items-baseline gap-2.5"
const FIN = ["Conventional", "FHA", "VA", "Cash"]
const CONT = ["Inspection", "Appraisal", "Mortgage", "Home sale"]
const money = (v: string) => {
  const d = v.replace(/[^0-9]/g, "")
  return d ? `$${Number(d).toLocaleString("en-US")}` : ""
}

export function OfferForm({
  home,
  clientFull,
  docs,
  onBack,
  onDone,
}: {
  home: { id: string; address: string; agentName: string; agentBrokerage: string; agentEmail: string; agentPhone: string }
  clientFull: string
  docs: DocView[]
  onBack: () => void
  onDone: () => void
}) {
  const [state, send, sending] = useActionState<HomeResult | null, FormData>(sendOffer, null)
  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])
  const [f, setF] = useState({
    agentName: home.agentName,
    agentBrokerage: home.agentBrokerage,
    agentEmail: home.agentEmail,
    agentPhone: home.agentPhone,
    amount: "",
    deposit: "",
    closingOn: "",
    goodDate: "",
    goodTime: "17:00",
    financing: "Conventional",
  })
  const [cont, setCont] = useState<string[]>(["Inspection", "Appraisal", "Mortgage"])
  const [picked, setPicked] = useState<string[]>(docs.map((d) => d.id))
  const set = (k: keyof typeof f, v: string) => setF((o) => ({ ...o, [k]: v }))
  const street = home.address.split(",")[0]
  const agentFirst = f.agentName.trim().split(/\s+/)[0]
  const [message, setMessage] = useState(
    `Hi ${home.agentName.trim().split(/\s+/)[0] || "there"},\n\nThank you for showing ${street}. My buyer${clientFull ? `, ${clientFull},` : ""} would like to make an offer. The terms are below${docs.length ? ", and the supporting documents are attached" : ""}.\n\nLet me know if you or the sellers have any questions.`,
  )

  return (
    <form action={send}>
      <button type="button" onClick={onBack} className="mb-4 text-sm text-[#5d5b62]">&larr; {street}</button>
      <h3 className="font-serif text-[26px] leading-tight">Make an offer</h3>
      <p className="mt-1 text-sm text-[#5d5b62]">On {street}. It goes to the listing agent from you, and their reply comes to your email.</p>
      <input type="hidden" name="homeId" value={home.id} />

      <div className="mt-6 rounded-2xl border border-[#e4e3e0] p-5">
        <div className={section}><b className="font-serif font-normal text-[#BC559E]">01</b><p className="text-[15px] font-semibold">Listing agent</p></div>
        <div className="grid grid-cols-2 gap-3">
          <input name="agentName" value={f.agentName} onChange={(e) => set("agentName", e.target.value)} placeholder="Name" className={input} />
          <input name="agentBrokerage" value={f.agentBrokerage} onChange={(e) => set("agentBrokerage", e.target.value)} placeholder="Brokerage" className={input} />
          <input name="agentEmail" type="email" value={f.agentEmail} onChange={(e) => set("agentEmail", e.target.value)} placeholder="Email" className={input} />
          <input name="agentPhone" type="tel" value={f.agentPhone} onChange={(e) => set("agentPhone", e.target.value)} placeholder="Phone" className={input} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e4e3e0] p-5">
        <div className={section}><b className="font-serif font-normal text-[#BC559E]">02</b><p className="text-[15px] font-semibold">The offer</p></div>
        {clientFull && (
          <p className="mb-4 flex justify-between rounded-xl bg-[#f4f3f1] px-3.5 py-2.5 text-[14px]"><span className="text-[#8e8c93]">Buyer</span>{clientFull}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label><span className={label}>Offer price</span><input name="amount" inputMode="numeric" value={f.amount} onChange={(e) => set("amount", money(e.target.value))} placeholder="$545,000" className={input} /></label>
          <label><span className={label}>Earnest money</span><input name="deposit" inputMode="numeric" value={f.deposit} onChange={(e) => set("deposit", money(e.target.value))} placeholder="$10,000" className={input} /></label>
          <label><span className={label}>Closing date</span><input name="closingOn" type="date" value={f.closingOn} onChange={(e) => set("closingOn", e.target.value)} className={input} /></label>
          <label className="col-span-2"><span className={label}>Offer good until</span>
            <div className="flex gap-2">
              <input name="goodDate" type="date" value={f.goodDate} onChange={(e) => set("goodDate", e.target.value)} className={input} />
              <input name="goodTime" type="time" value={f.goodTime} onChange={(e) => set("goodTime", e.target.value)} className={`${input} w-[150px] shrink-0`} aria-label="Time" />
            </div>
          </label>
        </div>
        <p className={`${label} mt-4`}>Financing</p>
        <div className="flex flex-wrap gap-2">
          {FIN.map((x) => (
            <button type="button" key={x} onClick={() => set("financing", x)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${f.financing === x ? "border-ink bg-ink text-white" : "border-[#dddcd9] text-[#5d5b62]"}`}>{x}</button>
          ))}
        </div>
        <input type="hidden" name="financing" value={f.financing} />
        <p className={`${label} mt-4`}>Contingencies</p>
        <div className="flex flex-wrap gap-2">
          {CONT.map((x) => {
            const on = cont.includes(x)
            return (
              <button type="button" key={x} onClick={() => setCont((c) => (on ? c.filter((y) => y !== x) : [...c, x]))}
                className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${on ? "border-ink bg-ink text-white" : "border-[#dddcd9] text-[#5d5b62]"}`}>{x}</button>
            )
          })}
        </div>
        {cont.map((c) => <input key={c} type="hidden" name="contingency" value={c} />)}
      </div>

      <div className="mt-4 rounded-2xl border border-[#e4e3e0] p-5">
        <div className={section}><b className="font-serif font-normal text-[#BC559E]">03</b><p className="text-[15px] font-semibold">What goes with it</p></div>
        {docs.length === 0 ? (
          <p className="text-[14px] text-[#5d5b62]">No documents from {clientFull.split(" ")[0] || "your client"} yet. When they upload a pre-approval or proof of funds, it shows up here to attach.</p>
        ) : (
          docs.map((d) => {
            const on = picked.includes(d.id)
            return (
              <label key={d.id} className="flex items-center gap-3 border-t border-[#efeeec] py-2.5 text-[14.5px] first:border-0">
                <input type="checkbox" name="doc" value={d.id} checked={on} onChange={() => setPicked((p) => (on ? p.filter((y) => y !== d.id) : [...p, d.id]))} className="h-4 w-4 accent-[#6E56CF]" />
                {d.title}
              </label>
            )
          })
        )}
        <p className="mt-3 text-[12.5px] text-[#8e8c93]">Your brokerage&rsquo;s own offer form attaches here once we set it up with you.</p>
      </div>

      <div className="mt-4">
        <p className={label}>Your note to {agentFirst || "the listing agent"}</p>
        <textarea name="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={input} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button disabled={sending} className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60">
          {sending ? "Sending…" : `Send offer${f.amount ? ` of ${f.amount}` : ""}`}
        </button>
        {state && !state.ok && <span className="text-sm text-[#b42318]">{state.message}</span>}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-[#8e8c93]">Goes out in your name with your signature. The reply comes straight to your email, and the offer shows on this home.</p>
    </form>
  )
}

export function FollowUpForm({
  offer,
  street,
  agentName,
  clientFirst,
  onBack,
  onDone,
}: {
  offer: OfferView
  street: string
  agentName: string
  clientFirst: string
  onBack: () => void
  onDone: () => void
}) {
  const [state, send, sending] = useActionState<HomeResult | null, FormData>(followUpOffer, null)
  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])
  const first = agentName.trim().split(/\s+/)[0] || "there"
  const [message, setMessage] = useState(
    `Hi ${first},\n\nChecking in on our offer for ${street} at ${offer.amount}. ${clientFirst ? `${clientFirst} is` : "My buyer is"} ready to move${offer.goodLabel ? `, and the offer stands until ${offer.goodLabel}` : ""}.\n\nIs there anything you or the sellers would like from us?`,
  )
  return (
    <form action={send}>
      <button type="button" onClick={onBack} className="mb-4 text-sm text-[#5d5b62]">&larr; {street}</button>
      <h3 className="font-serif text-[26px] leading-tight">Follow up with {first}</h3>
      <p className="mt-1 text-sm text-[#5d5b62]">Your offer of {offer.amount}{offer.goodLabel ? ` · good until ${offer.goodLabel}` : ""}</p>
      <input type="hidden" name="offerId" value={offer.id} />
      <p className={`${label} mt-6`}>Message</p>
      <textarea name="message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} className={input} />
      <p className="mt-2 text-[12.5px] text-[#8e8c93]">Written for you. Change anything before you send. The offer terms go with it.</p>
      <div className="mt-5 flex items-center gap-3">
        <button disabled={sending} className="rounded-full bg-ink px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60">
          {sending ? "Sending…" : "Send"}
        </button>
        {state && !state.ok && <span className="text-sm text-[#b42318]">{state.message}</span>}
      </div>
    </form>
  )
}
