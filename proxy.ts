import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

// Keeps the agent's session fresh and guards the dashboard.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as never)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const guarded =
    path.startsWith("/dashboard") ||
    path.startsWith("/settings") ||
    path.startsWith("/start-here") ||
    path.startsWith("/bookings") ||
    path.startsWith("/clients") ||
    path.startsWith("/documents")
  if (!user && guarded) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/start-here/:path*",
    "/bookings/:path*",
    "/clients/:path*",
    "/documents/:path*",
    "/login",
    "/signup",
  ],
}
