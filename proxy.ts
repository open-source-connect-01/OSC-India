import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { searchParams, pathname } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // If Supabase falls back to Site URL ("/") with OAuth code, forward to callback for exchange.
  // If an OAuth error lands on "/", forward directly to /sign-in so user sees the message cleanly.
  if (error && pathname === "/") {
    const signInUrl = new URL("/sign-in", request.url);
    const desc = searchParams.get("error_description") || error;
    signInUrl.searchParams.set("error", desc);
    return NextResponse.redirect(signInUrl);
  }

  if (code && pathname === "/") {
    const callbackUrl = new URL("/auth/callback", request.url);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Always refresh auth session so cookies stay valid across all navigation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedUserRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/badge") ||
    pathname.startsWith("/leaderboard");

  if (isProtectedUserRoute) {
    // 1. Not authenticated -> Redirect to /sign-in
    if (!user) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image formats
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
