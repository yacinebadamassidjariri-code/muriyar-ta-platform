import { Link } from "@/lib/i18n/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { ModerationCopy } from "./content";
import { formatDateTime, langLabel, shortId, type QueueItem } from "./shared";

export function QueueList({
  items,
  locale,
  copy,
}: {
  items: QueueItem[];
  locale: string;
  copy: ModerationCopy;
}) {
  if (items.length === 0) {
    return <Card className="p-8 text-center text-ink-soft">{copy.queue.empty}</Card>;
  }
  return (
    <Card className="divide-y divide-line">
      {items.map((it) => (
        <Link
          key={it.submission_id}
          href={`/admin/moderation/${it.submission_id}`}
          className="flex items-center justify-between gap-4 p-4 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {copy.queue.item} · {shortId(it.submission_id)}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {formatDateTime(it.submission_timestamp, locale)} · {langLabel(it.language_code)} ·{" "}
              {it.char_count} {copy.queue.length}
            </p>
          </div>
          <StatusBadge state={it.current_state} copy={copy} />
        </Link>
      ))}
    </Card>
  );
}
