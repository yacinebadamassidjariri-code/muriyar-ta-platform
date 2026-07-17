import { Card } from "@/components/ui/card";
import type { ModerationCopy } from "./content";
import { formatDateTime, langLabel, type ReviewSubmission } from "./shared";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="min-w-0 max-w-[65%] break-words text-right font-medium text-ink">
        {value}
      </dd>
    </div>
  );
}

export function SubmissionMeta({
  submission,
  locale,
  copy,
}: {
  submission: ReviewSubmission;
  locale: string;
  copy: ModerationCopy;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink">
          {copy.detail.metaTitle}
        </h2>
        <dl className="divide-y divide-line">
          <Row
            label={copy.detail.language}
            value={langLabel(submission.language_code)}
          />
          <Row label={copy.detail.country} value={submission.country ?? "—"} />
          <Row label={copy.detail.region} value={submission.region ?? "—"} />
          <Row
            label={copy.detail.submitted}
            value={formatDateTime(submission.submission_timestamp, locale)}
          />
          <Row
            label={copy.detail.length}
            value={`${submission.char_count} ${copy.detail.chars}`}
          />
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="mb-2 text-sm font-semibold text-ink">
          {copy.detail.consentTitle}
        </h2>
        <dl className="divide-y divide-line">
          <Row
            label={copy.detail.consentGiven}
            value={submission.consent_given ? copy.detail.yes : copy.detail.no}
          />
          <Row
            label={copy.detail.consentVersion}
            value={String(submission.consent_version_id ?? "—")}
          />
          <Row
            label={copy.detail.consentAt}
            value={formatDateTime(submission.consent_timestamp, locale)}
          />
          <Row
            label={copy.detail.consentLang}
            value={(submission.consent_language ?? "—").toUpperCase()}
          />
        </dl>
      </Card>
    </div>
  );
}
