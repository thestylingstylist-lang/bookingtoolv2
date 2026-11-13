import { redirect } from "next/navigation"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { siteUrl } from "@/lib/stripe"
import GiftForm from "./gift-form"
import { deleteGiftCard } from "./actions"

export const dynamic = "force-dynamic"

// Gift cards: made for an agent before she signs up, claimed with her own login.
export default async function AdminCards() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) redirect("/login")
  if (!isAdminEmail(user.email)) redirect("/dashboard")

  const { data: rows, error } = await createAdminClient()
    .from("agents")
    .select("id, full_name, business_name, slug, headshot_url, claim_token, gifted_at")
    .not("gifted_at", "is", null)
    .order("gifted_at", { ascending: false })
  const cards = await Promise.all(
    (rows ?? []).map(async (r) => {
      const preview = r.claim_token ? `${siteUrl()}/book/${r.slug}?claim=${r.claim_token}` : `${siteUrl()}/book/${r.slug}`
      const qr = await QRCode.toString(preview, { type: "svg", margin: 1, color: { dark: "#16151a", light: "#ffffff" } })
      return { ...r, preview, qr }
    }),
  )

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-[28px] font-semibold tracking-tight">Gift cards</h1>
      <p className="mt-1 text-[14px] text-[#55535b]">Make an agent’s card before you meet her. The QR code opens her card, private, with a Claim button.</p>
      {error && <p className="mt-4 text-[13px] text-[#b3261e]">Run supabase/card-4.sql first.</p>}

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-[#efeeec]">
        <GiftForm />
      </section>

      <section className="mt-8 flex flex-col gap-3">
        {cards.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-[#efeeec]">
            {c.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.headshot_url as string} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-[#EEEEF1]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{c.full_name}</p>
              <p className="text-[13px] text-[#8e8c93]">
                {c.business_name} · {c.claim_token ? "Waiting to be claimed" : "Claimed"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                <a href={c.preview} target="_blank" rel="noreferrer" className="underline underline-offset-4">Open her card</a>
                <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.qr)}`} download={`${c.slug}-card-qr.svg`} className="underline underline-offset-4">Download QR code</a>
                {c.claim_token && (
                  <form action={deleteGiftCard.bind(null, c.id as string)}>
                    <button className="text-[#b3261e] underline underline-offset-4">Delete</button>
                  </form>
                )}
              </div>
            </div>
            <div className="h-20 w-20 flex-none [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.qr }} />
          </div>
        ))}
      </section>
    </main>
  )
}
