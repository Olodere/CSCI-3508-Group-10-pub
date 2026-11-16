import { NextResponse, type NextRequest } from "next/server";

// Quick check only: visitors with no session cookie at all are sent to the
// login page before anything renders. It does NOT check that the cookie is
// valid; the admin page asks the API (lib/admin-session.ts), and the API
// checks every /api/admin request itself.
const LOGIN_PATH = "/admin/login";
const SESSION_COOKIE_NAME = "session";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname !== LOGIN_PATH && !req.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
