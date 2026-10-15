import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Password-reset emails land here. We swap the one-time code for a session,
// then send the agent on to set a new password.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const nextParam = searchParams.get("next") ?? "/dashboard"
  // Only allow same-site paths, never an outside address.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard"

  // One-time sign-in link made by the Marvberry team to set up a realtor's account.
  if (tokenHash && type === "magiclink") {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" })
    if (!error) return NextResponse.redirect(new URL(next, origin))
    return NextResponse.redirect(new URL("/login?error=link", origin))
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }
  return NextResponse.redirect(new URL("/forgot-password?error=link", origin))
}
