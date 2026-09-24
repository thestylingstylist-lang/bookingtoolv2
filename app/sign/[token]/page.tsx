import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { signDocument } from "./actions"

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

  return (
    <main className="min-h-screen bg-[#f8f3ef] px-5 py-12 text-[#3d3230]">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-[#8a7872]">
          From {from}
          {agent?.business_name && agent.full_name ? ` · ${agent.business_name}` : ""}
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[#1c1a19]">{doc.title}</h1>

        <article className="mt-8 whitespace-pre-wrap rounded-2xl border border-[#ece5df] bg-white p-7 text-[15px] leading-relaxed">
          {doc.body}
        </article>

        {signed ? (
          <div className="mt-8 rounded-2xl bg-[#f2e4dd] p-6">
            <p className="font-serif text-xl text-[#1c1a19]">Signed. Thank you.</p>
            <p className="mt-2 text-sm">
              Signed by <strong>{doc.signer_name}</strong> on {signedLabel}. {from} has been
              notified.
            </p>
          </div>
        ) : (
          <form action={signDocument} className="mt-8 rounded-2xl border border-[#ece5df] bg-white p-7">
            <input type="hidden" name="token" value={token} />
            {sp.error && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
                {sp.error === "save"
                  ? "Something went wrong. Please try again."
                  : "Type your full name and check the box to sign."}
              </p>
            )}
            <label className="block text-sm text-[#8a7872]">Type your full legal name</label>
            <input
              name="fullName"
              required
              minLength={2}
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-[#d8bfb3] bg-white px-4 py-3 font-serif text-xl outline-none focus:border-[#b08477]"
            />
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" name="agree" required className="mt-1" />
              <span>
                I have read this document and agree that typing my name above is my electronic
                signature.
              </span>
            </label>
            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-[#3d3230] px-6 py-3.5 text-base text-white transition-opacity hover:opacity-90"
            >
              Sign
            </button>
            <p className="mt-3 text-center text-xs text-[#8a7872]">
              Your name, the date and time, and your IP address are recorded with your signature.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
