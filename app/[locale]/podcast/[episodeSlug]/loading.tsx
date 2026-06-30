export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-4xl px-4 pb-16"
      role="status"
      aria-live="polite"
    >
      <div className="mt-10 h-4 w-32 animate-pulse rounded bg-brand-50" />
      <div className="mt-6 h-10 w-3/4 animate-pulse rounded bg-brand-100" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-brand-50" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-brand-50" />
      <div className="mt-8 h-16 animate-pulse rounded-xl border border-line bg-surface-muted" />
      <div className="mt-12 h-6 w-40 animate-pulse rounded bg-brand-100" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-surface-muted"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}