import "server-only";

/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Called from every public submission server action BEFORE any database
 * interaction. Tokens must never be logged or included in error responses.
 *
 * Environment variables required:
 *   TURNSTILE_SECRET_KEY — Cloudflare Turnstile secret key (server-only)
 *
 * When TURNSTILE_SECRET_KEY is absent the function returns a hard failure
 * so that missing configuration is caught immediately rather than silently
 * allowing all submissions through.
 */

export type TurnstileResult =
  | { ok: true }
  | { ok: false; code: "verification_failed" | "verification_expired" | "verification_error" };

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
): Promise<TurnstileResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    // Configuration error — fail closed, never open.
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set");
    return { ok: false, code: "verification_error" };
  }

  // Missing or empty token — bot submitted the form without completing the
  // challenge, or JS was disabled.
  if (!token || token.trim() === "") {
    return { ok: false, code: "verification_failed" };
  }

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // Do NOT include remoteip — we do not collect or forward IP addresses.
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
      // Short timeout — don't hold up the form for a slow network call.
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    // Network error or timeout reaching Cloudflare.
    // Log only the error type, never the token.
    console.error("[turnstile] siteverify fetch failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, code: "verification_error" };
  }

  let body: { success: boolean; "error-codes"?: string[] };
  try {
    body = await response.json();
  } catch {
    console.error("[turnstile] siteverify response was not valid JSON", {
      status: response.status,
    });
    return { ok: false, code: "verification_error" };
  }

  if (!body.success) {
    // Map Cloudflare error codes to user-facing codes.
    // "timeout-or-duplicate" is the only code that maps to expired; everything
    // else is treated as a general failure.
    const codes = body["error-codes"] ?? [];
    // Log the Cloudflare error codes for diagnostics; they contain no PII.
    if (codes.length > 0) {
      console.error("[turnstile] siteverify returned error codes", { codes });
    }
    if (codes.includes("timeout-or-duplicate")) {
      return { ok: false, code: "verification_expired" };
    }
    return { ok: false, code: "verification_failed" };
  }

  return { ok: true };
}
