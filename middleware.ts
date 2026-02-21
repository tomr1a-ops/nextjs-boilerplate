import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal middleware.
 * - No more ADMIN_API_KEY / x-admin-key gating.
 * - Let server routes handle auth (or the /admin layout gate).
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Run middleware on everything EXCEPT Next internals/static.
// (You can also remove this config entirely; it's fine either way.)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
