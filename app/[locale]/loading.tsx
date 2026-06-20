export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16" role="status" aria-live="polite">
      <div className="h-2 w-32 animate-pulse rounded bg-brand-100" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
