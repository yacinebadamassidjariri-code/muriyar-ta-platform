export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <div className="h-4 w-32 animate-pulse rounded bg-brand-50" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-brand-100" />
          <div className="h-4 w-72 animate-pulse rounded bg-brand-50" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded bg-surface-muted" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-brand-50" />
            <div className="h-10 w-full animate-pulse rounded-md border border-line bg-surface-muted" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 border-t border-line pt-6">
        <div className="h-10 w-28 animate-pulse rounded bg-surface-muted" />
        <div className="h-10 w-28 animate-pulse rounded bg-surface-muted" />
        <div className="h-10 w-28 animate-pulse rounded bg-surface-muted" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}