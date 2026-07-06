import { Save, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EpisodeStatus } from "@/lib/data/admin/podcast";
import { saveDraftAction } from "@/lib/actions/podcast/save-draft";
import { publishAction } from "@/lib/actions/podcast/publish";
import { unpublishAction } from "@/lib/actions/podcast/unpublish";

type Labels = {
  save: string;
  publish: string;
  unpublish: string;
  publishHint: string;     // shown next to disabled publish
  unpublishHint: string;   // shown next to disabled unpublish
};

/**
 * Three submit buttons inside the parent form. Each carries its own
 * formAction so the same form payload routes to the correct server action.
 * State-gated by the episode's current status (matches the RPC's gates).
 */
export function EpisodeActions({
  status,
  labels,
}: {
  status: EpisodeStatus;
  labels: Labels;
}) {
  const canPublish = status === "draft";
  const canUnpublish = status === "published";

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <Button type="submit" formAction={saveDraftAction}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {labels.save}
      </Button>

      <Button
        type="submit"
        formAction={publishAction}
        variant="secondary"
        disabled={!canPublish}
        aria-disabled={!canPublish}
        title={canPublish ? undefined : labels.publishHint}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {labels.publish}
      </Button>

      <Button
        type="submit"
        formAction={unpublishAction}
        variant="secondary"
        disabled={!canUnpublish}
        aria-disabled={!canUnpublish}
        title={canUnpublish ? undefined : labels.unpublishHint}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {labels.unpublish}
      </Button>
    </div>
  );
}