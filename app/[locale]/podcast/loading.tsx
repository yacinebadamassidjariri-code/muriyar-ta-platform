export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--mt-content-wide)] px-[var(--mt-gutter)] pb-16"
      role="status"
      aria-live="polite"
    >
      <div className="py-10 md:py-14">
        <div className="h-3 w-24 animate-pulse bg-[var(--mt-divider-soft)]" />
        <div className="mt-3 h-9 w-2/3 animate-pulse bg-[var(--mt-divider)]" />
        <div className="mt-4 h-4 w-3/4 animate-pulse bg-[var(--mt-divider-soft)]" />
      </div>

      <div className="mt-6 h-48 animate-pulse border-y border-[var(--mt-divider)] bg-[var(--mt-paper)]" />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse border-y border-[var(--mt-divider)] bg-[var(--mt-paper)]"
          />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-pulse border border-[var(--mt-divider)]"
          />
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse border-y border-[var(--mt-divider)] bg-[var(--mt-paper)]"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
