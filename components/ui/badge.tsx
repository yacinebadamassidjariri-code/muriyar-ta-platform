import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Small pill for topics, categories, and tags. */
export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface-muted px-3 py-1 text-sm font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}
