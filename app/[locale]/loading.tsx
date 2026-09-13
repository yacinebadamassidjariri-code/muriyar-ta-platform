export default function Loading() {
  return (
    <div className="mx-auto max-w-[var(--mt-content-wide)] px-[var(--mt-gutter)] py-16" role="status" aria-live="polite">
      <div className="h-1 w-32 animate-pulse bg-[var(--mt-divider)]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
