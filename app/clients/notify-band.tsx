"use client"

import { useEffect, useState } from "react"
import DMark from "@/app/d-mark"
import IphoneSteps from "@/app/iphone-steps"
import { declineNotify } from "@/app/notify-actions"
import { needsHomeScreen, pushSupported, turnOn } from "@/app/push-client"

// Asked once, after the first client is added. "Not now" means never again here;
// Settings can still turn them on.
type State = "hidden" | "ask" | "iphone" | "working" | "blocked" | "on" | "failed"

export default function NotifyBand({ letter = "D" }: { letter?: string }) {
  const [state, setState] = useState<State>("hidden")

  useEffect(() => {
    if (needsHomeScreen()) return setState("iphone")
    if (!pushSupported()) return
    if (Notification.permission === "granted") return
    setState(Notification.permission === "denied" ? "blocked" : "ask")
  }, [])

  if (state === "hidden") return null

  const notNow = (
    <button
      type="button"
      onClick={() => {
        setState("hidden")
        void declineNotify()
      }}
      className="border-0 border-b border-lxgold bg-transparent p-0 text-[13px] text-lxink"
    >
      Not now
    </button>
  )

  return (
    <div className="mt-6 flex flex-col gap-4 border-y border-lxgold/60 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4 sm:items-center">
        <DMark size={32} letter={letter} />
        {state === "iphone" ? (
          <IphoneSteps />
        ) : (
          <p className="text-[15px] text-lxink">
            {state === "on"
              ? "Done. You'll get a quiet heads-up on this device."
              : state === "blocked"
                ? "Your browser is blocking notifications. Turn them on in your browser settings, then come back."
                : state === "failed"
                  ? "That didn't switch on. Try again in a moment."
                  : (
                    <>
                      Want a quiet heads-up when a client writes or signs?{" "}
                      <span className="text-lxsoft">You can change this anytime.</span>
                    </>
                  )}
          </p>
        )}
      </div>
      {state !== "on" && (
        <div className="flex shrink-0 items-center gap-6">
          {notNow}
          {(state === "ask" || state === "failed" || state === "working") && (
            <button
              type="button"
              disabled={state === "working"}
              onClick={async () => {
                setState("working")
                const r = await turnOn()
                setState(r === "on" ? "on" : r === "blocked" ? "blocked" : "failed")
              }}
              className="min-h-[40px] rounded-[2px] border border-lxink bg-transparent px-5 text-[13px] text-lxink disabled:opacity-50"
            >
              {state === "working" ? "Turning on…" : "Turn on"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
