import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { teamNote, para, button, small } from "@/lib/letter"

// Our own reset email. The link goes straight to marvberry.com and works on any
// device or browser, so it never bounces someone to the sign-up page.
export async function sendResetEmail(email: string): Promise<"sent" | "none" | "fail"> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) return error?.status === 404 || /not found/i.test(error?.message ?? "") ? "none" : "fail"

  const url = `https://www.marvberry.com/auth/callback?token_hash=${encodeURIComponent(hash)}&type=recovery&next=/reset-password`
  const text = `Hi,\n\nHere's your link to set a new password for Marvberry:\n\n${url}\n\nIt works once and expires within the hour. If you didn't ask for this, you can ignore it.\n\nThe Marvberry team`
  const html = teamNote(
    "Set a new password.",
    para("Here&rsquo;s your link to choose a new password for Marvberry.") +
      button(url, "Set a new password") +
      small("It works once and expires within the hour. If you didn&rsquo;t ask for this, you can ignore it."),
  )
  const ok = await sendEmail({ to: email, subject: "Set a new Marvberry password", html, text, fromName: "Marvberry", replyTo: "team@marvberry.com" })
  return ok ? "sent" : "fail"
}
