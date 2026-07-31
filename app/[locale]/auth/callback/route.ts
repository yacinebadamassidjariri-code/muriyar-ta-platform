import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { parseAuthOtpType, safeAuthRedirect } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const next = safeAuthRedirect(requestUrl.searchParams.get("next"), locale);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = parseAuthOtpType(requestUrl.searchParams.get("type"));
  const supabase = await createClient();

  let error: Error | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    error = result.error;
  } else {
    const destination = new URL(`/${locale}/auth/complete`, requestUrl.origin);
    destination.searchParams.set("next", next);
    return NextResponse.redirect(destination);
  }

  if (error) {
    const destination = new URL(`/${locale}/auth/error`, requestUrl.origin);
    destination.searchParams.set("reason", "invalid_or_expired");
    return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
