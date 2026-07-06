import { Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NewEpisodeButton } from "./new-episode-button";

/**
 * Two-mode empty state:
 *   - "fresh"   → onboarding copy + New Episode button
 *   - "filtered"→ search/filter feedback; no CTA, just guidance
 */
export function PodcastEmptyState({
  mode,
  labels,
}: {
  mode: "fresh" | "filtered";
  labels: {
    freshTitle: string;
    freshBody: string;
    filteredTitle: string;
    filteredBody: string;
    newEpisode: string;
  };
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Mic className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-ink">
        {mode === "fresh" ? labels.freshTitle : labels.filteredTitle}
      </h2>
      <p className="max-w-md text-ink-soft">
        {mode === "fresh" ? labels.freshBody : labels.filteredBody}
      </p>
      {mode === "fresh" ? (
        <div className="mt-2">
          <NewEpisodeButton label={labels.newEpisode} />
        </div>
      ) : null}
    </Card>
  );
}