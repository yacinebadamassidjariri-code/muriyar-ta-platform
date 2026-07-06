import { CircleDot, CheckCircle2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { EpisodeStatus } from "@/lib/data/admin/podcast";

type Labels = {
  draft: string;
  published: string;
  archived: string;
};

const styles: Record<EpisodeStatus, string> = {
  draft: "border-line bg-surface-muted text-ink",
  published: "border-brand-100 bg-brand-50 text-brand-800",
  archived: "border-line bg-surface-muted text-ink-soft",
};

export function PodcastStatusBadge({
  status,
  labels,
}: {
  status: EpisodeStatus;
  labels: Labels;
}) {
  const Icon =
    status === "published"
      ? CheckCircle2
      : status === "archived"
        ? Archive
        : CircleDot;

  return (
    <Badge className={cn("inline-flex items-center gap-1", styles[status])}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {labels[status]}
    </Badge>
  );
}