export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-64 animate-pulse rounded bg-brand-100" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded bg-brand-50" />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="h-44 animate-pulse rounded-xl border border-line bg-surface-muted" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading…</span>
    </div>
  );
}