"use client";

import { useState, useEffect } from "react";
import { enrollTotp, verifyTotp } from "@/lib/auth/mfa";
import type { AuthCopy } from "./content";

/**
 * TotpEnrollForm — guides an administrator through TOTP factor enrollment.
 *
 * Flow:
 *  1. On mount: calls enrollTotp() to get a fresh QR code + secret from Supabase.
 *  2. Shows the QR code SVG and the manual secret key.
 *  3. User scans with their authenticator app and types the first 6-digit code.
 *  4. On submit: calls verifyTotp() which challenges + verifies, upgrading the
 *     session to AAL2 and marking the factor as "verified" in Supabase.
 *  5. On success: shows a confirmation message and reloads to /admin.
 *
 * The QR code data URI (SVG) returned by Supabase is rendered directly as an
 * <img> src — no third-party QR library needed.
 */

type EnrollState =
  | { phase: "loading" }
  | { phase: "ready"; factorId: string; qrCode: string; secret: string }
  | { phase: "error"; message: string }
  | { phase: "success" };

export function TotpEnrollForm({
  locale,
  copy,
}: {
  locale: string;
  copy: AuthCopy;
}) {
  const [state, setState] = useState<EnrollState>({ phase: "loading" });
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    enrollTotp().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setState({
          phase: "error",
          message: error?.message ?? "Could not start enrollment.",
        });
        return;
      }
      setState({
        phase: "ready",
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "ready") return;
    setPending(true);
    setSubmitError(null);
    try {
      const { error } = await verifyTotp(state.factorId, code.replace(/\s/g, ""));
      if (error) {
        setSubmitError(copy.mfaEnrollError);
        setCode("");
        setPending(false);
        return;
      }
      setState({ phase: "success" });
      // Hard reload so the admin layout re-reads the new AAL2 session.
      window.location.assign(`/${locale}/admin`);
    } catch {
      setSubmitError(copy.mfaEnrollError);
      setCode("");
      setPending(false);
    }
  }

  if (state.phase === "loading") {
    return (
      <p className="text-sm text-stone-500" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
        {state.message}
      </p>
    );
  }

  if (state.phase === "success") {
    return (
      <p className="rounded-md bg-success/10 p-4 text-sm font-medium text-success">
        {copy.mfaEnrollSuccess}
      </p>
    );
  }

  // phase === "ready"
  return (
    <div className="space-y-8">
      {/* QR code */}
      <div>
        <p className="text-sm font-semibold text-stone-700">
          {copy.mfaEnrollScanHeading}
        </p>
        <p className="mt-0.5 text-sm text-stone-500">{copy.mfaEnrollScanBody}</p>
        <div className="mt-4 inline-block rounded-xl border border-stone-200 bg-white p-3">
          {/* Supabase returns the QR code as a data: URI (SVG). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.qrCode}
            alt="QR code for authenticator app"
            width={180}
            height={180}
            className="block"
          />
        </div>
      </div>

      {/* Manual secret */}
      <div>
        <p className="text-sm font-semibold text-stone-700">
          {copy.mfaEnrollManualHeading}
        </p>
        <code className="mt-1.5 block break-all rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs tracking-widest text-charcoal-900 select-all">
          {state.secret}
        </code>
      </div>

      {/* Verification form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="totp-enroll-code"
            className="text-sm font-semibold text-stone-700"
          >
            {copy.mfaEnrollCodeLabel}
          </label>
          <p className="mt-0.5 text-xs text-stone-500">{copy.mfaEnrollCodeHelp}</p>
          <input
            id="totp-enroll-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-center font-mono text-xl tracking-[0.35em] text-charcoal-900 placeholder:text-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
          />
        </div>

        {submitError !== null ? (
          <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="min-h-11 w-full rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
        >
          {pending ? copy.mfaEnrollPending : copy.mfaEnrollSubmit}
        </button>
      </form>
    </div>
  );
}
