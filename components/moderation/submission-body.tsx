import { Card } from "@/components/ui/card";
import type { ModerationCopy } from "./content";

export function SubmissionBody({
  body,
  copy,
}: {
  body: string | null;
  copy: ModerationCopy;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">{copy.detail.storyTitle}</h2>
      {body && body.trim().length > 0 ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{body}</p>
      ) : (
        <p className="text-sm italic text-ink-soft">{copy.detail.bodyEmpty}</p>
      )}
    </Card>
  );
}
