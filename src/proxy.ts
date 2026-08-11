import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// An optimistic, edge-safe route guard — checks only whether a session
// cookie is present (no DB call, no signature verification; Better
// Auth's own documented pattern for this exact use, see `better-auth/
// cookies`). This exists purely to redirect a logged-out visitor to Sign
// In *before* a protected page starts rendering (no flash of stale
// content) and to preserve where they were headed — it is a UX
// convenience, not the security boundary. Every Server Component/Action
// downstream still validates the real session itself (see
// server/auth/session.ts's `requireSession`, docs/authentication.md) —
// this file being bypassed (a matcher gap, a new route) can never turn
// into a data-access bug on its own.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("next", next);
  return NextResponse.redirect(signInUrl);
}

// `/` is deliberately absent — it renders the public Landing page for a
// logged-out visitor rather than redirecting at all (see
// app/page.tsx, docs/authentication.md, "`/` behavior by auth state").
// An explicit allow-list of protected destinations, not a "protect
// everything except…" negative match — a route accidentally left off
// this list fails safely closed (still real-session-gated by its own
// Server Components, per the module comment above), never open.
export const config = {
  matcher: [
    "/calendar/:path*",
    "/discover/:path*",
    "/library/:path*",
    "/movies/:path*",
    "/people/:path*",
    "/pick/:path*",
    "/settings/:path*",
    "/shows/:path*",
    "/stats/:path*",
  ],
};
