"use client";

import { cn } from "@/lib/utils/cn";
import type { BriefStatus } from "@/lib/data/admin/insights";

const STATUS_CONFIG: Record<
  BriefStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-stone-100 text-stone-700",
  },
  IN_REVIEW: {
    label: "In review",
    className: "bg-amber-100 text-amber-800",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800",
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-800",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-stone-200 text-stone-500",
  },
};

export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
