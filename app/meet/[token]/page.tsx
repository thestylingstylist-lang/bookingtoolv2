import "../../suite-fonts"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadInvite, howLine } from "@/lib/meetings"
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar"
import { AgentHeader, SuiteFooter, BTN, QUIET_SM } from "@/app/suite-ui"
import { confirmMeeting } from "./actions"

export const metadata = { title: "Choose a time", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

// Where a client lands after tapping a time in their suite or email.
// One more tap confirms, so an email app opening links by itself can't book.
export default async function MeetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ o?: string; all?: string; done?: string; problem?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const admin = createAdminClient()
  const v = await loadInvite(admin, token)

  const shell = (inner: React.ReactNode, header?: { name: string; brokerage: string }) => (
    <main className="min-h-screen bg-lxbg px-[26px] pb-8 pt-10 font-luxsans text-lxink antialiased md:pt-16">
      <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col">
        {header && <AgentHeader name={header.name} brokerage={header.brokerage} />}
        <div className="flex-1">{inner}</div>
        <SuiteFooter />
      </div>
    </main>
  )

  if (!v)
    return shell(
      <>
        <h1 className="mb-0 mt-9 font-lux text-[32px] font-light">This link isn&rsquo;t working.</h1>
        <p className="mt-3 text-[15px] text-lxsoft">It may have been mistyped. Reply to your agent&rsquo;s email, and they&rsquo;ll send a fresh one.</p>
      </>,
    )

  const head = { name: v.agentName, brokerage: v.brokerage }
  const { data: client } = await admin.from("clients").select("portal_token").eq("id", v.clientId).maybeSingle()
  const suiteHref = client?.portal_token ? `/portal/${client.portal_token}` : null
  const what = `A ${v.minutes}-minute ${v.kind === "phone" ? "phone call" : v.kind === "video" ? "video call" : "meeting"} with ${v.agentFirst}. ${howLine(v, v.kind === "video" ? v.meetingLink : undefined)}`
  const chosen = v.options.find((o) => o.chosen)

  if (v.status === "booked" && chosen) {
    const cal = { title: `Meeting with ${v.agentName}`, details: what, startISO: chosen.startISO, minutes: v.minutes }
    return shell(
      <>
        <h1 className="mb-0 mt-9 font-lux text-[34px] font-light">You&rsquo;re booked.</h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#3E3B37]">
          {chosen.label}. {howLine(v, v.kind === "video" ? v.meetingLink : undefined)}
          {sp.done ? " A confirmation is on its way to your email." : ""}
        </p>
        <p className="mb-0 mt-7 text-[14px] text-lxsoft">Add to calendar</p>
        <p className="mt-2 flex gap-4 text-[14px]">
          <a className={QUIET_SM} href={googleCalendarUrl(cal)} target="_blank" rel="noreferrer">Google</a>
          <a className={QUIET_SM} href={`/meet/${token}/ics`}>Apple</a>
          <a className={QUIET_SM} href={outlookCalendarUrl(cal)} target="_blank" rel="noreferrer">Outlook</a>
        </p>
        {suiteHref && (
          <p className="mt-8 text-[13px]">
            <a className={QUIET_SM} href={suiteHref}>Back to your suite</a>
          </p>
        )}
      </>,
      head,
    )
  }

  const bookLink = v.slug ? `/book/${v.slug}` : null
  if (v.status !== "waiting")
    return shell(
      <>
        <h1 className="mb-0 mt-9 font-lux text-[32px] font-light">These times have passed.</h1>
        <p className="mt-3 text-[15px] text-lxsoft">No trouble. You can choose another time that suits you.</p>
        {bookLink && (
          <p className="mt-7">
            <a className={BTN} href={bookLink}>Choose another time</a>
          </p>
        )}
      </>,
      head,
    )

  const open = v.options.filter((o) => o.open)
  const pick = !sp.all && !sp.problem ? open.find((o) => o.id === sp.o) : undefined

  if (pick)
    return shell(
      <>
        <h1 className="mb-0 mt-9 font-lux text-[32px] font-light leading-[1.15]">{pick.label}</h1>
        <p className="mt-3 text-[14px] text-lxsoft">{what}</p>
        <form action={confirmMeeting} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="option" value={pick.id} />
          <button type="submit" className={`${BTN} w-full`}>Confirm this time</button>
        </form>
        {open.length > 1 && (
          <p className="mt-5 text-center text-[13px]">
            <a className={QUIET_SM} href={`/meet/${token}?all=1`}>Pick a different time</a>
          </p>
        )}
      </>,
      head,
    )

  return shell(
    <>
      <h1 className="mb-0 mt-9 font-lux text-[32px] font-light">
        {sp.problem === "taken" ? "That time was just taken." : `Choose a time${v.clientFirst ? `, ${v.clientFirst}` : ""}`}
      </h1>
      <p className="mt-3 text-[14px] text-lxsoft">{sp.problem === "taken" ? "These are still open." : what}</p>
      <div className="mt-6 flex flex-col">
        {open.map((o) => (
          <a key={o.id} href={`/meet/${token}?o=${o.id}`} className="mt-2.5 block rounded-[2px] border border-lxink px-4 py-3.5 text-[15px] text-lxink no-underline">
            {o.label}
          </a>
        ))}
      </div>
      {bookLink && (
        <p className="mt-6 text-[13px]">
          <a className={QUIET_SM} href={bookLink}>None of these work</a>
        </p>
      )}
    </>,
    head,
  )
}
