import { Link } from "@/lib/i18n/navigation";
import { FloralSeparator } from "@/components/home/botanical";

/**
 * The archive's opening when no stories have been published yet. Framed as a
 * beginning rather than an absence: a quiet botanical mark, a serif title, a
 * warm line of possibility, and an invitation to become the first storyteller.
 * Used only by the Stories archive, so it takes its editorial copy directly.
 */
export function StoriesEmptyState({
  title,
  body,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center">
      <FloralSeparator className="w-40 max-w-full text-rose-200" />
      <h2 className="font-display text-2xl font-medium text-plum-800 md:text-3xl">
        {title}
      </h2>
      <p className="max-w-md leading-relaxed text-charcoal-500">{body}</p>
      {ctaLabel ? (
        <Link
          href="/submit"
          className="mt-1 inline-flex items-center text-sm font-medium uppercase tracking-[0.14em] text-plum-700 transition-colors hover:text-plum-900"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
