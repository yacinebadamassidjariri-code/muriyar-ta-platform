import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Reusable error message. Two visual modes:
 *   - "banner" (default): top-level page error, role=alert, assertive.
 *   - "field": per-field inline message, polite.
 *
 * In both modes the consumer is responsible for connecting `id` to the
 * field's `aria-describedby` (banner mode usually doesn't need this).
 */
export function InlineError({
  id,
  mode = "banner",
  children,
  className,
}: {
  id?: string;
  mode?: "banner" | "field";
  children: React.ReactNode;
  className?: string;
}) {
  if (mode === "field") {
    return (
      <p
        id={id}
        role="status"
        aria-live="polite"
        className={cn("mt-1 text-sm text-danger", className)}
      >
        {children}
      </p>
    );
  }
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}