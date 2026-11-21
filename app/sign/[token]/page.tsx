import "../../suite-fonts"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { suiteName } from "@/lib/suite"
import { BTN, LINE, SuiteFooter, initialsOf } from "../../suite-ui"
import SignBlock from "./sign-block"

export const dynamic = "force-dynamic"
export const metadata = { robots: { index: false, follow: false } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SignPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  if (!UUID_RE.test(token)) notFound()

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("id, agent_id, client_id, title, body, status, signer_name, signed_at")
    .eq("sign_token", token)
    .maybeSingle()
  if (!doc) notFound()

  const { data: agent } = await admin
    .from("agents")
    .select("full_name, business_name, timezone")
    .eq("id", doc.agent_id)
    .maybeSingle()

  const from = agent?.full_name || agent?.business_name || "Your agent"
  const signed = doc.status === "signed"

  // Once it's signed, point them to their page for what comes next.
  let portalHref = ""
  let suite = "private suite"
  if (signed && doc.client_id) {
    const { data: client } = await admin.from("clients").select("portal_token, client_type").eq("id", doc.client_id).maybeSingle()
    if (client?.portal_token) portalHref = `/portal/${client.portal_token}`
    suite = suiteName(client?.client_type)
  }
  const agentFirst = (agent?.full_name || "").trim().split(/\s+/)[0] || from
  const signedLabel =
    signed && doc.signed_at
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: agent?.timezone || "America/New_York",
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date(doc.signed_at))
      : ""

  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: agent?.timezone || "America/New_York",
    dateStyle: "long",
  }).format(new Date())
  const signedDate =
    signed && doc.signed_at
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: agent?.timezone || "America/New_York",
          dateStyle: "long",
        }).format(new Date(doc.signed_at))
      : ""

  const brokerage = agent?.business_name && agent.full_name ? agent.business_name : ""
  const line = (label: string, content: React.ReactNode) => (
    <div>
      <p className="m-0 text-[12px] text-lxsoft">{label}</p>
      <div className="flex h-[50px] items-end border-b border-lxink pb-1.5">{content}</div>
    </div>
  )

  return (
    <main className="min-h-screen bg-lxbg px-[26px] pb-8 pt-10 font-luxsans text-lxink antialiased md:pt-16">
      <div className="mx-auto max-w-[680px]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lxgold font-lux text-[13px] tracking-[1px]">
            {initialsOf(from)}
          </div>
          <div>
            <p className="m-0 text-[12px] text-lxsoft">Prepared by</p>
            <p className="m-0 mt-px font-lux text-[18px] font-medium">
              {from}
              {brokerage && <span className="font-luxsans text-[12px] font-normal text-lxsoft"> &middot; {brokerage}</span>}
            </p>
          </div>
        </div>
        <h1 className="m-0 mt-7 font-lux text-[34px] font-light leading-[1.1] md:text-[42px]">{doc.title}</h1>
        <div className={`my-6 h-px border-t ${LINE}`} />

        {signed && (
          <div className="flex flex-col items-center px-2 pb-8 pt-2.5 text-center">
            <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-lxgold" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F1E1C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="m-0 mt-[18px] font-lux text-[30px] font-light">Agreement signed</p>
            <p className="m-0 mt-2.5 max-w-md text-[14px] leading-relaxed text-lxsoft">
              Thank you. Your agreement is signed below, and {agentFirst} has a copy.
              {portalHref ? ` Your next steps are waiting in your ${suite}.` : ""}
            </p>
            {portalHref && (
              <a href={portalHref} className={`${BTN} mt-6`}>
                Open your {suite}
              </a>
            )}
          </div>
        )}

        <article className="whitespace-pre-wrap font-lux text-[18px] leading-[1.6] text-lxink">{doc.body}</article>

        {signed ? (
          <div className={`mt-8 border-t ${LINE} pt-[22px]`}>
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-[18px] sm:grid-cols-[minmax(0,1fr)_170px]">
              {line("Buyer\u2019s signature", <span className="font-lux text-[30px] italic leading-none">{doc.signer_name}</span>)}
              {line("Date", <span className="text-[13px]">{signedDate}</span>)}
            </div>
            <p className="m-0 mt-3.5 text-[11.5px] text-lxsoft">Signed electronically on {signedLabel}.</p>
          </div>
        ) : (
          <SignBlock token={token} today={today} error={sp.error} />
        )}

        <SuiteFooter />
      </div>
    </main>
  )
}
