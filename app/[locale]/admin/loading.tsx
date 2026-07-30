"use client";

import { useLocale } from "next-intl";
import { getAdminCopy } from "@/components/admin/content";

export default function AdminLoading() {
  const copy = getAdminCopy(useLocale());
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{copy.loading}</span>
      <div className="h-9 w-64 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-lg bg-stone-50 motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-lg bg-stone-50 motion-reduce:animate-none" />
    </div>
  );
}
