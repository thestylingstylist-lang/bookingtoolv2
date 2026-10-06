import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import SignBlock from "./sign-block"

const HAND = { fontFamily: "'Caveat', cursive" }

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
    .select("id, agent_id, title, body, status, signer_name, signed_at")
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

  return (
    <main className="min-h-screen bg-[#f1f0ee] px-5 py-12 text-[#2b2520]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap"
      />
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-[#8a8072]">
          From {from}
          {agent?.business_name && agent.full_name ? ` · ${agent.business_name}` : ""}
        </p>
        <h1 className="mt-2 font-[Georgia,serif] text-[28px] leading-tight text-[#2b2520]">{doc.title}</h1>

        <div className="mt-8 rounded-xl border border-[#e6e5e3] bg-white px-6 py-8 shadow-[0_8px_30px_rgba(43,37,32,0.06)] sm:px-10">
          <article className="whitespace-pre-wrap font-[Georgia,serif] text-[15px] leading-relaxed text-[#4a433b]">
            {doc.body}
          </article>

          {signed ? (
            <div className="mt-10 border-t border-[#e6e5e3] pt-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_170px]">
                <div>
                  <p className="text-[13px] text-[#8a8072]">Buyer&rsquo;s signature</p>
                  <div className="relative mt-1 h-14 border-b border-[#2b2520]/50">
                    <span
                      style={HAND}
                      className="absolute bottom-0.5 left-1 text-[38px] leading-none text-[#1f2a5c]"
                    >
                      {doc.signer_name}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-[#4a433b]">{doc.signer_name}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#8a8072]">Date</p>
                  <div className="mt-1 flex h-14 items-end border-b border-[#2b2520]/50 pb-2 text-[15px] text-[#2b2520]">
                    {signedDate}
                  </div>
                </div>
              </div>
              <p className="mt-5 text-xs text-[#8a8072]">Signed electronically on {signedLabel}.</p>
            </div>
          ) : (
            <SignBlock token={token} today={today} error={sp.error} />
          )}
        </div>

        {signed && (
          <p className="mt-6 text-center font-[Georgia,serif] text-[17px] text-[#2b2520]">
            Signed. Thank you. {from} has been notified.
          </p>
        )}
      </div>
    </main>
  )
}
