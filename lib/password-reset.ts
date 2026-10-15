import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"

// Our own reset email. The link goes straight to marvberry.com and works on any
// device or browser, so it never bounces someone to the sign-up page.
export async function sendResetEmail(email: string): Promise<"sent" | "none" | "fail"> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) return error?.status === 404 || /not found/i.test(error?.message ?? "") ? "none" : "fail"

  const url = `https://www.marvberry.com/auth/callback?token_hash=${encodeURIComponent(hash)}&type=recovery&next=/reset-password`
  const text = `Hi,\n\nHere's your link to set a new password for Marvberry:\n\n${url}\n\nIt works once and expires within the hour. If you didn't ask for this, you can ignore it.\n\nThe Marvberry team`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2a221c;max-width:520px">
<p>Hi,</p><p>Here's your link to set a new password for Marvberry.</p>
<p style="margin:26px 0"><a href="${url}" style="background:#2a221c;color:#f6efe5;text-decoration:none;padding:12px 24px;border-radius:999px">Set a new password</a></p>
<p>It works once and expires within the hour. If you didn't ask for this, you can ignore it.</p><p>The Marvberry team</p></div>`
  const ok = await sendEmail({ to: email, subject: "Set a new Marvberry password", html, text, fromName: "Marvberry", replyTo: "team@marvberry.com" })
  return ok ? "sent" : "fail"
}
