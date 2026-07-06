export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-brand-100" />
          <div className="h-4 w-72 animate-pulse rounded bg-brand-50" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded bg-surface-muted" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-md border border-line bg-surface-muted"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse border-b border-line bg-surface-muted last:border-b-0"
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="h-4 w-48 animate-pulse rounded bg-brand-50" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded bg-surface-muted" />
          <div className="h-9 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}