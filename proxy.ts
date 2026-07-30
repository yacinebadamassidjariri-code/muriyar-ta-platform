import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleInternationalization = createIntlMiddleware(routing);

/**
 * Optimistic boundary only: refresh Supabase cookies and apply locale routing.
 * Secure authorization remains in Server Components, actions, RPCs, RLS, and
 * Storage policies.
 */
export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);
  const response = handleInternationalization(request);

  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
