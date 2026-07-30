import type { ReactNode } from "react";

export function EditorialBulkToolbar({
  label,
  selected,
  children,
  notice,
  noticeIsError = false,
}: {
  label: string;
  selected: ReactNode;
  children: ReactNode;
  notice?: ReactNode;
  noticeIsError?: boolean;
}) {
  return (
    <section
      className="rounded-xl border border-line bg-surface p-4"
      aria-label={label}
    >
      <div className="flex flex-wrap items-end gap-3">
        <strong className="min-w-24 text-sm">{selected}</strong>
        {children}
      </div>
      {notice ? (
        <p
          role="status"
          className={`mt-3 text-sm ${noticeIsError ? "text-danger" : "text-emerald-700"}`}
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}
