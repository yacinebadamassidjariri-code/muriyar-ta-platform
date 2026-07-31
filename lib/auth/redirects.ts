const SUPPORTED_AUTH_OTP_TYPES = new Set([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export type SupportedAuthOtpType =
  | "email"
  | "email_change"
  | "invite"
  | "magiclink"
  | "recovery"
  | "signup";

export function safeAuthRedirect(
  candidate: string | null,
  locale: string,
  fallback = `/${locale}/admin`,
): string {
  if (
    !candidate ||
    !candidate.startsWith(`/${locale}/`) ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\0")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://www.muriyarta.org");
    if (parsed.origin !== "https://www.muriyarta.org") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function parseAuthOtpType(
  value: string | null,
): SupportedAuthOtpType | null {
  return value && SUPPORTED_AUTH_OTP_TYPES.has(value)
    ? (value as SupportedAuthOtpType)
    : null;
}

export function recoveryCallbackUrl(origin: string, locale: string): string {
  const next = `/${locale}/auth/update-password?mode=recovery`;
  const callback = new URL(`/${locale}/auth/callback`, origin);
  callback.searchParams.set("next", next);
  return callback.toString();
}
