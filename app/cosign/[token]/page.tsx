import "../../suite-fonts"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { LINE, SuiteFooter, initialsOf } from "../../suite-ui"
import SignBlock from "../../sign/[token]/sign-block"
import SignatureLines, { whenLabel } from "../../sign/signature-lines"
import { cleanDoc } from "@/lib/doc-text"
import { clientRoleOf, signersOf } from "@/lib/signing"
import { cosignDocument } from "./actions"

export const dynamic = "force-dynamic"
export const metadata = { robots: { index: false, follow: false } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The broker's private page: read the agreement the agent signed, and co-sign it.
export default async function CosignPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params
  const sp = await searchParams
  if (!UUID_RE.test(token)) notFound()

  const admin = createAdminClient()
  const { data: doc } = await admin
    .from("documents")
    .select("id, agent_id, client_id, title, body, status, signer_name, signed_at, signed_ip, agent_signed_name, agent_signed_at, broker_name, broker_signed_name, broker_signed_at, broker_signed_ip")
    .eq("broker_token", token)
    .maybeSingle()
  if (!doc) notFound()

  const [{ data: agent }, { data: client }] = await Promise.all([
    admin.from("agents").select("full_name, business_name, timezone").eq("id", doc.agent_id).maybeSingle(),
    admin.from("clients").select("first_name, last_name, client_type").eq("id", doc.client_id).maybeSingle(),
  ])
  const from = agent?.full_name || agent?.business_name || "The agent"
  const brokerage = agent?.business_name && agent.full_name ? agent.business_name : ""
  const tz = agent?.timezone || "America/New_York"
  const clientName = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim() || "the client"
  const cosigned = !!doc.broker_signed_at
  const lines = signersOf(doc, clientRoleOf(client?.client_type as string | null)).map((x) => ({ role: x.role, name: x.name, when: whenLabel(x.at, tz) }))
  const today = new Intl.DateTimeFormat("en-US", { timeZone: tz, dateStyle: "long" }).format(new Date())

  return (
    <main className="min-h-screen bg-lxbg px-[26px] pb-8 pt-10 font-luxsans text-lxink antialiased md:pt-16">
      <div className="mx-auto max-w-[680px]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lxgold font-lux text-[13px] tracking-[1px]">{initialsOf(from)}</div>
          <div>
            <p className="m-0 text-[12px] text-lxsoft">Prepared by</p>
            <p className="m-0 mt-px font-lux text-[18px] font-medium">
              {from}
              {brokerage && <span className="font-luxsans text-[12px] font-normal text-lxsoft"> &middot; {brokerage}</span>}
            </p>
          </div>
        </div>
        <h1 className="m-0 mt-7 font-lux text-[34px] font-light leading-[1.1] md:text-[42px]">{doc.title}</h1>
        <p className="m-0 mt-2 text-[14px] text-lxsoft">For {clientName}</p>
        <div className={`my-6 h-px border-t ${LINE}`} />

        {cosigned && (
          <p className="m-0 mb-8 border-l-2 border-lxgold pl-3 text-[14px] leading-relaxed text-lxink">
            Co-signed. {doc.signed_at ? `${clientName} has signed too.` : `${clientName} has it now to sign.`}
          </p>
        )}

        <article className="whitespace-pre-wrap font-lux text-[18px] leading-[1.6] text-lxink">{cleanDoc(doc.body ?? "")}</article>

        <div className={`mt-8 border-t ${LINE} pt-[22px]`}>
          <SignatureLines lines={lines} />
          {!cosigned && (
            <div className={lines.length ? "mt-[22px]" : ""}>
              <SignBlock token={token} today={today} error={sp.error} role="Broker’s signature" action={cosignDocument} bordered={false} />
            </div>
          )}
        </div>

        <SuiteFooter />
      </div>
    </main>
  )
}
