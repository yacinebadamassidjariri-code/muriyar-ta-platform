export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 pb-16"
      role="status"
      aria-live="polite"
    >
      <div className="py-10 md:py-14">
        <div className="h-3 w-24 animate-pulse rounded bg-brand-50" />
        <div className="mt-3 h-9 w-2/3 animate-pulse rounded bg-brand-100" />
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-brand-50" />
      </div>

      <div className="mt-6 h-56 animate-pulse rounded-xl border border-line bg-surface-muted" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-line bg-surface-muted"
          />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-pulse rounded bg-surface-muted"
          />
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-xl border border-line bg-surface-muted"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}