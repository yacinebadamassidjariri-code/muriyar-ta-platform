"use client";

import { useLocale } from "next-intl";
import { getAdminCopy } from "@/components/admin/content";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const copy = getAdminCopy(useLocale());
  return (
    <section role="alert" className="max-w-2xl rounded-lg border border-danger/30 bg-danger/10 p-6">
      <h1 className="font-display text-3xl font-semibold text-plum-900">
        {copy.safeErrorTitle}
      </h1>
      <p className="mt-3 leading-7 text-stone-700">{copy.safeErrorBody}</p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-stone-500">
          Request reference: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-5 min-h-11 rounded-md bg-plum-700 px-4 text-sm font-semibold text-white hover:bg-plum-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600"
      >
        {copy.tryAgain}
      </button>
    </section>
  );
}
