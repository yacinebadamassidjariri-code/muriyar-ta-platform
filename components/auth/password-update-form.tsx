"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthCopy } from "./content";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export function PasswordUpdateForm({
  locale,
  copy,
}: {
  locale: string;
  copy: AuthCopy;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!PASSWORD_PATTERN.test(password)) {
      setError(copy.passwordRequirements);
      return;
    }
    if (password !== confirmation) {
      setError(copy.passwordMismatch);
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(copy.updateError);
        setPending(false);
        return;
      }
      window.location.assign(`/${locale}/admin`);
    } catch {
      setError(copy.updateError);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="new-password"
          className="text-sm font-semibold text-stone-700"
        >
          {copy.newPassword}
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-requirements"
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
        <p id="password-requirements" className="mt-2 text-sm text-stone-600">
          {copy.passwordRequirements}
        </p>
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="text-sm font-semibold text-stone-700"
        >
          {copy.confirmPassword}
        </label>
        <input
          id="confirm-password"
          name="password-confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
      >
        {pending ? copy.updatePending : copy.updateSubmit}
      </button>
    </form>
  );
}
