import { Card } from "./card";

/** A single statistic with a value, label, and source attribution. */
export function Stat({
  value,
  label,
  source,
}: {
  value: string;
  label: string;
  source?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-bold text-brand-700">{value}</p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      {source ? (
        <p className="mt-2 text-xs uppercase tracking-wide text-ink-soft">
          {source}
        </p>
      ) : null}
    </Card>
  );
}
