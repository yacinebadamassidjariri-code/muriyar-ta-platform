export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--mt-reading-width)] px-[var(--mt-gutter)] py-16"
      role="status"
      aria-live="polite"
    >
      <div className="h-4 w-32 animate-pulse bg-[var(--mt-divider-soft)]" />
      <div className="mt-6 h-10 w-3/4 animate-pulse bg-[var(--mt-divider)]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse bg-[var(--mt-divider-soft)]" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse bg-[var(--mt-divider-soft)]"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
