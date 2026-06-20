import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Standard page section: optional eyebrow, an accessible <h2> title, optional
 * description, then content. Reusable across marketing/content pages.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("mt-14", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="mt-1 text-2xl font-bold text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
