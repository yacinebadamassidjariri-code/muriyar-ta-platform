"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthCopy } from "./content";

export function LoginForm({ locale, copy }: { locale: string; copy: AuthCopy }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setHasError(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setHasError(true);
        setPending(false);
        return;
      }
      window.location.assign(`/${locale}/admin`);
    } catch {
      setHasError(true);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="staff-email" className="text-sm font-semibold text-stone-700">
          {copy.email}
        </label>
        <input
          id="staff-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
      </div>
      <div>
        <label htmlFor="staff-password" className="text-sm font-semibold text-stone-700">
          {copy.password}
        </label>
        <input
          id="staff-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-md border border-stone-200 bg-cream-50 px-3 text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
        />
      </div>
      {hasError ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          {copy.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full rounded-md bg-plum-700 px-4 font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 disabled:opacity-60"
      >
        {pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
