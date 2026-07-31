"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recoveryCallbackUrl } from "@/lib/auth/redirects";
import type { AuthCopy } from "./content";

export function PasswordResetRequestForm({
  locale,
  copy,
}: {
  locale: string;
  copy: AuthCopy;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("idle");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryCallbackUrl(window.location.origin, locale),
      });
      setStatus(error ? "error" : "success");
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="recovery-email"
          className="text-sm font-semibold text-stone-700"
        >
          {copy.email}
        </label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
      </div>
      {status === "success" ? (
        <p
          role="status"
          className="rounded-md bg-success-50 p-3 text-sm text-success-700"
        >
          {copy.resetSuccess}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          {copy.resetError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
      >
        {pending ? copy.resetPending : copy.resetSubmit}
      </button>
    </form>
  );
}
