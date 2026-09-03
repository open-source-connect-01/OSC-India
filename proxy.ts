import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  // For now, we skip auth checks until next-auth is properly configured.
  // Once NextAuth is set up, you can use session cookies here to check auth state.
  if (isDashboardRoute) {
    // TODO: Check for auth session cookie and redirect to /sign-in if not logged in
    // const sessionToken = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
    // if (!sessionToken) {
    //   return NextResponse.redirect(new URL('/sign-in', request.url));
    // }
  }

  return NextResponse.next();
}

// Optionally, don't invoke Proxy on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
