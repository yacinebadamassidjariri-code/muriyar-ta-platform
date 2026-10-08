"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listFactors, verifyTotp } from "@/lib/auth/mfa";
import type { AuthCopy } from "./content";

/**
 * TotpVerifyForm — TOTP challenge for an already-enrolled administrator.
 *
 * Shown when: the session is AAL1 (password-only) and a verified TOTP factor
 * already exists. Calling verifyTotp() upgrades the session to AAL2, after
 * which the admin layout will allow access.
 *
 * On success: hard-reload to /admin so the server layout re-reads the token.
 * Sign-out link: lets the user fall back to a different account if needed.
 */
export function TotpVerifyForm({
  locale,
  copy,
}: {
  locale: string;
  copy: AuthCopy;
}) {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      // Resolve the first verified factor's ID at submit time.
      const { data: factorsData, error: listError } = await listFactors();
      if (listError || !factorsData) {
        setError(copy.mfaVerifyError);
        setPending(false);
        return;
      }
      const factor = factorsData.totp.find((f) => f.status === "verified");
      if (!factor) {
        setError(copy.mfaVerifyError);
        setPending(false);
        return;
      }

      const { error: verifyError } = await verifyTotp(
        factor.id,
        code.replace(/\s/g, ""),
      );
      if (verifyError) {
        setError(copy.mfaVerifyError);
        setCode("");
        setPending(false);
        return;
      }
      // Session is now AAL2 — reload to the admin panel.
      window.location.assign(`/${locale}/admin`);
    } catch {
      setError(copy.mfaVerifyError);
      setCode("");
      setPending(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign(`/${locale}/login`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="totp-verify-code"
          className="text-sm font-semibold text-stone-700"
        >
          {copy.mfaVerifyCodeLabel}
        </label>
        <p className="mt-0.5 text-xs text-stone-500">{copy.mfaVerifyCodeHelp}</p>
        <input
          id="totp-verify-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-center font-mono text-xl tracking-[0.35em] text-charcoal-900 placeholder:text-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
      </div>

      {error !== null ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="min-h-11 w-full rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
      >
        {pending ? copy.mfaVerifyPending : copy.mfaVerifySubmit}
      </button>

      <div className="border-t border-stone-100 pt-4 text-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-sm text-stone-500 underline-offset-4 hover:text-stone-700 hover:underline disabled:opacity-60"
        >
          {copy.mfaVerifySignOut}
        </button>
      </div>
    </form>
  );
}
