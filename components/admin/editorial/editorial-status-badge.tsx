const COLORS: Record<string, string> = {
  draft: "border-stone-300 bg-stone-50 text-stone-700",
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  assigned: "border-amber-200 bg-amber-50 text-amber-900",
  in_review: "border-amber-200 bg-amber-50 text-amber-900",
  approved: "border-blue-200 bg-blue-50 text-blue-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  scheduled: "border-sky-300 bg-sky-50 text-sky-800",
  published: "border-emerald-300 bg-emerald-50 text-emerald-800",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};

export function EditorialStatusBadge({ status, label }: { status: string; label: string }) {
  const normalizedStatus = status.toLowerCase();
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${COLORS[normalizedStatus] ?? COLORS.draft}`}>{label}</span>;
}
