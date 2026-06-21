import { Card } from "@/components/ui/card";
import type { ModerationCopy } from "./content";
import { formatDateTime, type HistoryItem } from "./shared";

export function ModerationHistory({
  items,
  locale,
  copy,
}: {
  items: HistoryItem[];
  locale: string;
  copy: ModerationCopy;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-ink">{copy.history.title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">{copy.history.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.action_id} className="border-l-2 border-line pl-3">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium text-ink">{copy.actions[a.action_type] ?? a.action_type}</span>
                {a.from_state && a.to_state && a.from_state !== a.to_state ? (
                  <span className="text-xs text-ink-soft">
                    {copy.states[a.from_state] ?? a.from_state} {copy.history.arrow}{" "}
                    {copy.states[a.to_state] ?? a.to_state}
                  </span>
                ) : null}
                <span className="text-xs text-ink-soft">· {formatDateTime(a.created_at, locale)}</span>
              </div>
              {a.note ? <p className="mt-1 text-sm text-ink-soft">{a.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
