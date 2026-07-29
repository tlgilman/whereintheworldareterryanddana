import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Never redirect API routes (e.g. /api/users PUT request to set new password)
    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // If user is logged in with mustChangePassword = true, force redirect to /auth/change-password
    if (token?.mustChangePassword && pathname !== "/auth/change-password") {
      return NextResponse.redirect(new URL("/auth/change-password", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        // Allow API routes to be handled by API route handlers
        if (pathname.startsWith("/api")) {
          return true;
        }

        // Force password change check if logged in and mustChangePassword is true
        if (token?.mustChangePassword) {
          return true;
        }

        // Protected routes require logged-in session
        if (pathname.startsWith("/admin") || pathname.startsWith("/profile")) {
          return Boolean(token);
        }

        // All other public pages (Home, Pictures, Map, etc.) are viewable
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded image files)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|api).*)",
  ],
};
