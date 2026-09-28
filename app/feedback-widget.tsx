"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useFormState, useFormStatus } from "react-dom"
import { sendFeedback, type FeedbackResult } from "@/app/feedback-actions"

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gradient-to-r from-[#D9467A] to-[#EE7C55] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send feedback"}
    </button>
  )
}

export default function FeedbackWidget({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false)
  const [state, action] = useFormState<FeedbackResult | null, FormData>(sendFeedback, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the box after a successful send.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className={
          collapsed
            ? "group relative flex h-10 w-10 items-center justify-center rounded-lg text-[#16151a]/60 transition-colors hover:bg-white/70 hover:text-[#16151a]"
            : "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#16151a]/60 transition-colors hover:bg-white/70 hover:text-[#16151a]"
        }
      >
        <svg width={collapsed ? 20 : 18} height={collapsed ? 20 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.6A8.4 8.4 0 1 1 21 11.5z" />
        </svg>
        {!collapsed && "Send feedback"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50" style={{background:"radial-gradient(circle, rgba(232,155,180,1), transparent 70%), radial-gradient(circle at 60% 40%, rgba(251,201,142,.9), transparent 70%)",filter:"blur(28px)"}} />
            <h2 className="text-xl font-semibold tracking-tight text-[#16151a]">Help us build <em className="bg-gradient-to-r from-[#D9467A] to-[#EE7C55] bg-clip-text pr-1 font-serif italic text-transparent">your</em> Marvberry</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#16151a]/60">
              Tell us what you’d love to see — or what to take away — to make
              Marvberry feel more like yours. The things that help you close
              faster, run smoother, and build stronger relationships with your
              clients. We read every note, and updates land fast.
            </p>
            <form ref={formRef} action={action} className="mt-4">
              <textarea
                name="message"
                rows={5}
                required
                autoFocus
                placeholder="I wish Marvberry could…"
                className="w-full resize-none rounded-lg border border-[#16151a]/15 p-3 text-sm text-[#16151a] outline-none focus:border-[#D9467A]"
              />
              {state && (
                <p className={"mt-2 text-sm " + (state.ok ? "text-emerald-600" : "text-rose-600")}>
                  {state.message}
                </p>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3.5 py-2 text-sm text-[#16151a]/60 hover:text-[#16151a]">
                  Close
                </button>
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
