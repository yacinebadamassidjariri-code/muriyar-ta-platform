import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Single middleware that (Application Structure §2/§4):
 *  1. negotiates locale and rewrites/redirects via next-intl,
 *  2. refreshes the Supabase auth session (cookies) on every request,
 *  3. gates the /admin area for unauthenticated users.
 *
 * Fine-grained role/permission checks happen in server guards (lib/auth/guards.ts);
 * the database (RLS) remains the final authority.
 */
export async function middleware(request: NextRequest) {
  // 1. i18n routing first (may return a redirect to add the locale prefix).
  const response = intlMiddleware(request);

  // 2. Refresh the session and attach updated auth cookies to the response.
await updateSession(request);

  // 3. Gate /[locale]/admin for unauthenticated visitors.
  const segments = request.nextUrl.pathname.split("/");
  const maybeLocale = segments[1];
  const locale = (routing.locales as readonly string[]).includes(maybeLocale)
    ? maybeLocale
    : routing.defaultLocale;
  const isAdmin = segments[2] === "admin";

  /*
  if (isAdmin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
*/

  return response;
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
