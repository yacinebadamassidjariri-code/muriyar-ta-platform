export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-64 animate-pulse rounded bg-brand-100" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded bg-brand-50" />
      <div className="mt-8 h-10 w-full max-w-2xl animate-pulse rounded bg-surface-muted" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-pulse rounded-full bg-surface-muted"
          />
        ))}
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="h-56 animate-pulse rounded-xl border border-line bg-surface-muted" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading…</span>
    </div>
  );
}