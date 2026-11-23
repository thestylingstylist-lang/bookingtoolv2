"use client"

import { useActionState, useRef, useState, useTransition } from "react"
import { saveSettings, removeImage, type SettingsResult } from "./actions"
import { TIMEZONES, WEEKDAY_LABELS } from "@/lib/config"
import type { AgentRow } from "@/lib/agent"

const HOURS = Array.from({ length: 25 }, (_, i) => i)
const label = (h: number) =>
  h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : h === 24 ? "12 AM" : `${h - 12} PM`

export default function SettingsForm({
  agent,
  license = "",
  meetingLink = "",
  signaturePhoto = false,
  bookingLink,
}: {
  bookingLink?: React.ReactNode
  agent: AgentRow
  license?: string
  meetingLink?: string
  signaturePhoto?: boolean
}) {
  const [state, formAction, pending] = useActionState<SettingsResult | null, FormData>(
    saveSettings,
    null
  )

  return (
    <form action={formAction} className="space-y-6">
      {/* ---- Your business ---- */}
      <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6 space-y-6">
        <Head title="Your business" sub="How your business shows up to clients." />
        <Text label="Business name" name="businessName" defaultValue={agent.business_name} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Business phone" name="publicPhone" type="tel" defaultValue={agent.public_phone} placeholder="Shown to clients" />
          <Text label="Business email" name="publicEmail" type="email" defaultValue={agent.public_email} placeholder="Shown to clients" />
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="showContact" defaultChecked={agent.show_contact} className="mt-0.5 h-4 w-4 rounded border-lxink/30 accent-lxink" />
          <span className="text-sm text-lxink/70">
            Show my phone and email on the booking page
            <span className="mt-0.5 block text-xs text-lxink/50">When on, clients see them under your photo before they book.</span>
          </span>
        </label>
        <Text label="Tagline (optional)" name="tagline" defaultValue={agent.tagline} placeholder="e.g. Helping first-time buyers feel at home" />
      </section>

      {/* ---- Your brand ---- */}
      <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6 space-y-6">
        <Head title="Your brand" sub="Your logo and photo, on your booking page, your clients’ suites and your emails." />
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageField
            kind="logo"
            label="Logo"
            hint="Wide or square. PNG, JPEG, WEBP or GIF, up to 5 MB. Any empty space around it is trimmed."
            current={agent.logo_url}
            name={agent.full_name || agent.business_name}
            brokerage={agent.business_name}
          />
          <ImageField kind="headshot" label="Headshot" hint="A friendly photo of you. PNG, JPEG, WEBP or GIF, up to 5 MB." current={agent.headshot_url} round />
        </div>
      </section>

      {/* ---- Email signature ---- */}
      <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6 space-y-6">
        <Head title="Email signature" sub="It goes under every email you send a client, with your business phone and email from above." />
        <SignaturePicker name={agent.full_name || agent.business_name} photo={agent.headshot_url} initial={signaturePhoto} />
        <div>
          <Text label="License number (optional)" name="licenseNumber" defaultValue={license} maxLength={40} />
          <p className="mt-1.5 text-xs text-lxink/50">Shows in your signature and on your booking page, under your name. Leave it blank and nothing shows.</p>
        </div>
      </section>

      {/* ---- Booking ---- */}
      <section className="rounded-2xl border border-lxink/10 bg-card p-5 sm:p-6 space-y-6">
        <Head title="Booking" sub="Your booking link, your hours, and how clients book with you." />
        {bookingLink}
        <div>
          <Text label="Your video meeting link" name="meetingLink" defaultValue={meetingLink} placeholder="e.g. https://zoom.us/j/1234567890" maxLength={500} />
          <p className="mt-1.5 text-xs text-lxink/50">Your Zoom, Google Meet, or Teams link. It goes into every video booking confirmation.</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-lxink/70">Welcome message (optional)</span>
          <textarea
            name="welcomeMessage"
            defaultValue={agent.welcome_message}
            rows={3}
            maxLength={600}
            placeholder="A short, warm note shown at the top of your booking page."
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-lxink/70">Timezone</span>
          <select
            name="timezone"
            defaultValue={agent.timezone}
            className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("America/", "").replace("Pacific/", "").replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm text-lxink/70">Working days</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map(({ iso, label }) => (
              <label key={iso} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={iso}
                  defaultChecked={agent.weekdays.includes(iso)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-lxink/20 px-4 py-2 text-sm text-lxink/70 peer-checked:border-lxink peer-checked:bg-lxink peer-checked:text-lxbg">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Day starts" name="dayStart" defaultValue={agent.day_start}>
            {HOURS.slice(0, 24).map((h) => (
              <option key={h} value={h}>{label(h)}</option>
            ))}
          </Select>
          <Select label="Day ends" name="dayEnd" defaultValue={agent.day_end}>
            {HOURS.slice(1).map((h) => (
              <option key={h} value={h}>{label(h)}</option>
            ))}
          </Select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Slot length" name="slotMinutes" defaultValue={agent.slot_minutes}>
            {[15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </Select>
          <Text
            label="Booking window (days ahead)"
            name="daysAhead"
            type="number"
            min={1}
            max={60}
            defaultValue={String(agent.days_ahead)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm text-lxink/70">Minimum notice</span>
            <select
              name="minNoticeHours"
              defaultValue={String(agent.min_notice_hours ?? 24)}
              className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink"
            >
              <option value="0">No minimum</option>
              <option value="1">1 hour before</option>
              <option value="2">2 hours before</option>
              <option value="4">4 hours before</option>
              <option value="12">12 hours before</option>
              <option value="24">24 hours (next day)</option>
              <option value="48">48 hours (2 days)</option>
            </select>
            <p className="mt-1.5 text-xs text-lxink/50">
              How far ahead clients must book. &ldquo;24 hours&rdquo; stops same-day bookings.
            </p>
          </label>
        </div>
      </section>

      {state && (
        <p
          role="status"
          className={
            "rounded-lg px-4 py-3 text-sm " +
            (state.ok ? "bg-lxgold/15 text-lxink/80" : "bg-red-50 text-red-800")
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-lxink px-6 py-3 font-medium text-lxbg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving\u2026" : "Save company settings"}
      </button>
    </form>
  )
}

function ImageField({
  kind,
  label,
  hint,
  current,
  round,
  name = "",
  brokerage = "",
}: {
  kind: "logo" | "headshot"
  label: string
  hint: string
  current: string
  round?: boolean
  name?: string
  brokerage?: string
}) {
  const [preview, setPreview] = useState<string>(current)
  const [removed, setRemoved] = useState<boolean>(false)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = removed ? "" : preview
  const shape = round ? "rounded-2xl" : "rounded-xl"

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      setRemoved(false)
      // Show the logo the way it'll be saved: empty edges trimmed.
      if (kind === "logo") trimmedPreview(url).then((u) => u && setPreview(u))
    }
  }

  function onRemove() {
    startTransition(async () => {
      await removeImage(kind)
      setRemoved(true)
      setPreview("")
      if (inputRef.current) inputRef.current.value = ""
    })
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm text-lxink/70">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-lxink/15 bg-white/70 " +
            shape
          }
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className={kind === "logo" ? "h-full w-full object-contain p-2" : "h-full w-full object-cover"} />
          ) : (
            <span className="text-xs text-lxink/30">None</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            name={kind}
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPick}
            className="block w-full text-sm text-lxink/60 file:mr-3 file:rounded-[2px] file:border file:border-solid file:border-lxink file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-lxink hover:file:opacity-90"
          />
          {shown && (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="text-xs text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
            >
              {pending ? "Removing\u2026" : "Remove"}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-lxink/50">{hint}</p>
      {kind === "logo" && shown && <LogoPreview src={shown} name={name} brokerage={brokerage} />}
    </div>
  )
}

function Text({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-lxink/70">{label}</span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink focus:ring-2 focus:ring-lxink/20"
      />
    </label>
  )
}

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue: number
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-lxink/70">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-lxink/15 bg-white/70 px-4 py-3 outline-none focus:border-lxink"
      >
        {children}
      </select>
    </label>
  )
}

// Email signature: two layouts. The photo one is optional.
function SignaturePicker({ name, photo, initial }: { name: string; photo: string; initial: boolean }) {
  const [withPhoto, setWithPhoto] = useState(initial)
  const lines = (
    <div className="min-w-0">
      <div className="font-serif text-[15px] text-lxink">{name || "Your name"}</div>
      <div className="mt-1 h-1.5 w-24 rounded-full bg-lxink/15" />
      <div className="mt-1.5 h-1.5 w-16 rounded-full bg-lxink/10" />
      <div className="mt-1.5 h-1.5 w-28 rounded-full bg-lxink/10" />
    </div>
  )
  const option = (value: boolean, title: string, body: React.ReactNode) => (
    <label
      className={`block cursor-pointer rounded-2xl border p-4 transition ${
        withPhoto === value ? "border-lxink bg-white ring-2 ring-lxink/20" : "border-lxink/15 bg-white/60 hover:border-lxink/30"
      }`}
    >
      <input
        type="radio"
        name="signaturePhoto"
        value={value ? "1" : "0"}
        checked={withPhoto === value}
        onChange={() => setWithPhoto(value)}
        className="sr-only"
      />
      <div className="mb-3 text-sm text-lxink/70">{title}</div>
      {body}
    </label>
  )
  return (
    <div>
      <span className="mb-1.5 block text-sm text-lxink/70">Your email signature</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {option(false, "Name and details", lines)}
        {option(
          true,
          "With my photo",
          <div className="flex items-center gap-3">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-full bg-lxink/10" />
            )}
            {lines}
          </div>,
        )}
      </div>
      <p className="mt-1.5 text-xs text-lxink/50">
        It goes under every email you send a client, with your name, business, license, phone, email and booking link.
        {withPhoto && !photo ? " Add a headshot above and it shows here." : ""}
      </p>
    </div>
  )
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="font-serif font-semibold tracking-tight text-xl">{title}</h2>
      <p className="mt-1 text-sm text-lxink/60">{sub}</p>
    </div>
  )
}

// How the logo looks where clients see it: the suite header and the booking page.
function LogoPreview({ src, name, brokerage }: { src: string; name: string; brokerage: string }) {
  return (
    <div className="mt-5 grid gap-4">
      <div>
        <p className="mb-2 text-[12px] text-lxsoft">In your clients&rsquo; suites</p>
        <div className="flex items-center gap-3 border-b border-lxgold/50 bg-lxbg px-4 pb-3 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-[34px] w-auto max-w-[110px] shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="m-0 truncate font-lux text-[16px] text-lxink">{name}</p>
            {brokerage && brokerage !== name && <p className="m-0 truncate text-[11px] text-lxsoft">{brokerage}</p>}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[12px] text-lxsoft">On your booking page</p>
        <div className="flex flex-col items-center bg-lxbg px-4 py-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="mb-3 h-[22px] w-auto max-w-[150px] object-contain" />
          <p className="m-0 font-lux text-[18px] uppercase tracking-[.06em] text-lxink">{name}</p>
          <p className="m-0 mt-1 text-[10px] uppercase tracking-[.14em] text-lxsoft">Real estate agent{brokerage && brokerage !== name ? ` · ${brokerage}` : ""}</p>
        </div>
      </div>
    </div>
  )
}

// Trims empty or transparent edges in the browser, to match what's saved.
async function trimmedPreview(url: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) return null
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const ctx = c.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, w, h).data
    const bg = [d[0], d[1], d[2], d[3]]
    const same = (k: number) =>
      (d[k + 3] < 12 && bg[3] < 12) || (Math.abs(d[k] - bg[0]) < 12 && Math.abs(d[k + 1] - bg[1]) < 12 && Math.abs(d[k + 2] - bg[2]) < 12 && Math.abs(d[k + 3] - bg[3]) < 12)
    let top = h, left = w, right = -1, bottom = -1
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (!same((y * w + x) * 4)) {
          if (y < top) top = y
          if (y > bottom) bottom = y
          if (x < left) left = x
          if (x > right) right = x
        }
    if (right < 0 || (left === 0 && top === 0 && right === w - 1 && bottom === h - 1)) return null
    const out = document.createElement("canvas")
    out.width = right - left + 1
    out.height = bottom - top + 1
    out.getContext("2d")?.drawImage(c, left, top, out.width, out.height, 0, 0, out.width, out.height)
    return out.toDataURL("image/png")
  } catch {
    return null
  }
}
