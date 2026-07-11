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
  publishHint: string;
  unpublishHint: string;
};

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
      title={canPublish ? undefined : labels.publishHint}
    >
      <CheckCircle2 className="h-4 w-4" />
      {labels.publish}
    </Button>

    <Button
      type="submit"
      formAction={unpublishAction}
      variant="secondary"
      disabled={!canUnpublish}
      title={canUnpublish ? undefined : labels.unpublishHint}
    >
      <RotateCcw className="h-4 w-4" />
      {labels.unpublish}
    </Button>
  </div>
);
}