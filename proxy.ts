import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedUserRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/badge") ||
    pathname.startsWith("/leaderboard");

  if (isAdminRoute || isProtectedUserRoute) {
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

    // 2. Admin Route Protection -> Verify is_admin or admin role
    if (isAdminRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, role")
        .eq("id", user.id)
        .single();

      if (!profile || (!profile.is_admin && profile.role !== "admin")) {
        // Non-admin user attempting to access /admin -> Bounce to home
        const homeResponse = NextResponse.redirect(new URL("/", request.url));
        response.cookies.getAll().forEach((cookie) => {
          homeResponse.cookies.set(cookie);
        });
        return homeResponse;
      }
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
