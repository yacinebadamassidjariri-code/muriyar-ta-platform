import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Homepage-scoped section wrapper.
 *
 * Structurally identical to the shared `components/ui/Section` (same spacing,
 * same accessible heading semantics) but painted with the editorial palette —
 * plum headings/eyebrows over charcoal description text. It lives here, used
 * only by the homepage, so the homepage can adopt the editorial look WITHOUT
 * recoloring the app-wide `ui/Section` (which other pages still rely on).
 */
export function HomeSection({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("mt-14", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-plum-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="mt-1 text-2xl font-bold text-plum-800">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-charcoal-500">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
