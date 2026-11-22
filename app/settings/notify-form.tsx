"use client"

import { useActionState, useEffect, useState } from "react"
import { Switch } from "./assistant-form"
import IphoneSteps from "@/app/iphone-steps"
import { saveNotifySettings, sendTestNotification, removeSubscription, type NotifySettingsResult } from "@/app/notify-actions"
import { currentSubscription, needsHomeScreen, pushSupported, turnOn } from "@/app/push-client"

export type NotifyPrefs = { messages: boolean; signed: boolean; bookings: boolean; support: boolean; hoursOnly: boolean }

type Device = "checking" | "on" | "off" | "blocked" | "iphone" | "unsupported"

const link = "border-0 border-b border-lxgold bg-transparent p-0 text-lxink"

export default function NotifyForm({ prefs, hoursLabel }: { prefs: NotifyPrefs; hoursLabel: string }) {
  const [v, setV] = useState(prefs)
  const set = (k: keyof NotifyPrefs) => (on: boolean) => setV((p) => ({ ...p, [k]: on }))
  const [state, formAction, pending] = useActionState<NotifySettingsResult | null, FormData>(saveNotifySettings, null)
  const [device, setDevice] = useState<Device>("checking")
  const [note, setNote] = useState("")

  useEffect(() => {
    ;(async () => {
      if (needsHomeScreen()) return setDevice("iphone")
      if (!pushSupported()) return setDevice("unsupported")
      if (Notification.permission === "denied") return setDevice("blocked")
      setDevice((await currentSubscription()) ? "on" : "off")
    })()
  }, [])

  const status =
    device === "on" ? (
      <>
        On for this browser &middot;{" "}
        <button type="button" className={link} onClick={async () => setNote((await sendTestNotification()).message)}>
          Send a test
        </button>{" "}
        &middot;{" "}
        <button
          type="button"
          className={link}
          onClick={async () => {
            const sub = await currentSubscription()
            if (sub) {
              await removeSubscription(sub.endpoint)
              await sub.unsubscribe()
            }
            setDevice("off")
            setNote("")
          }}
        >
          Turn off
        </button>
      </>
    ) : device === "off" ? (
      <>
        Off for this browser, so these come by email.{" "}
        <button
          type="button"
          className={link}
          onClick={async () => {
            const r = await turnOn()
            if (r === "on") setDevice("on")
            else if (r === "blocked") setDevice("blocked")
            else setNote("That didn't switch on. Try again in a moment.")
          }}
        >
          Turn on
        </button>
      </>
    ) : device === "blocked" ? (
      "Your browser is blocking notifications. Turn them on in your browser settings, then come back."
    ) : device === "unsupported" ? (
      "This browser can't show notifications, so these come by email."
    ) : null

  return (
    <form action={formAction} className="space-y-1">
      {device === "iphone" ? <div className="pb-2"><IphoneSteps /></div> : <p className="text-[13.5px] text-lxsoft">{status}</p>}
      {note && <p role="status" className="text-[13px] text-lxsoft">{note}</p>}

      <div className="divide-y divide-lxink/10">
        <Switch name="messages" title="A client writes to you" line="Their name and the first line of the message." checked={v.messages} onChange={set("messages")} />
        <Switch name="signed" title="A document is signed" line="Who signed, and what." checked={v.signed} onChange={set("signed")} />
        <Switch name="bookings" title="A new booking" line="Who booked, and when." checked={v.bookings} onChange={set("bookings")} />
        <Switch name="support" title="Support replies" line="When our team answers you." checked={v.support} onChange={set("support")} />
        <Switch
          name="hoursOnly"
          title="Only during my hours"
          line={`${hoursLabel}, from your booking hours. Anything after hours waits, and arrives as one note when your day starts.`}
          checked={v.hoursOnly}
          onChange={set("hoursOnly")}
        />
      </div>

      {state && (
        <p role="status" className={"rounded-lg px-4 py-3 text-sm " + (state.ok ? "bg-lxgold/15 text-lxink/80" : "bg-red-50 text-red-800")}>
          {state.message}
        </p>
      )}
      <div className="pt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[2px] border border-lxink bg-transparent px-6 py-2.5 text-sm text-lxink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}
