import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedUserRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/badge");

  // Only check session on protected routes to maximize edge performance
  if (isAdminRoute || isProtectedUserRoute) {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Not authenticated -> Redirect to /sign-in
    if (!user) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
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
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/badge/:path*",
  ],
};
