export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--mt-content-wide)] px-[var(--mt-gutter)] py-16"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-64 max-w-full animate-pulse bg-[var(--mt-divider)]" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse bg-[var(--mt-divider-soft)]" />
      <div className="mt-8 h-10 w-full max-w-2xl animate-pulse border border-[var(--mt-divider)]" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-28 animate-pulse border border-[var(--mt-divider)]"
          />
        ))}
      </div>
      <ul className="mt-8 border-t border-[var(--mt-divider)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="h-32 animate-pulse border-b border-[var(--mt-divider)] bg-[var(--mt-paper)]" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
