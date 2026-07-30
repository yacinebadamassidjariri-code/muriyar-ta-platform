import type { ReactNode } from "react";

export function EditorialFilterPanel({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <>
      {title ? (
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      ) : null}
      <div className={title ? "mt-4" : undefined}>{children}</div>
      <div className="mt-4 flex flex-wrap gap-3">{actions}</div>
    </>
  );
}
