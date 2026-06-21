import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { ModerationCopy } from "./content";

const STYLES: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  IN_REVIEW: "border-brand-100 bg-brand-50 text-brand-700",
  APPROVED: "border-green-200 bg-green-50 text-green-700",
  REJECTED: "border-danger/30 bg-danger/10 text-danger",
};

export function StatusBadge({ state, copy }: { state: string; copy: ModerationCopy }) {
  return (
    <Badge className={cn("whitespace-nowrap", STYLES[state] ?? "")}>
      {copy.states[state] ?? state}
    </Badge>
  );
}
