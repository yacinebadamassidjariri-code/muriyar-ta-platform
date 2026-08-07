import { Link } from "@/lib/i18n/navigation";

/**
 * A calm but clearly distinct pointer to crisis support, in the platform's rose
 * crisis idiom — a warm outlined block, not a red alert banner. Communicates
 * urgency through placement and the rose accent while staying editorial.
 */
export function CrisisCallout({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: string;
}) {
  return (
    <aside className="mt-10 border-y border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8">
        <div>
          <p className="font-display text-xl font-medium text-plum-900">
            {heading}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-charcoal-500">
            {body}
          </p>
        </div>
        <Link
          href="/resources/crisis"
          className="inline-flex w-fit items-center gap-2 border-b border-rose-400 pb-1 text-sm font-semibold text-plum-800 transition-colors hover:border-plum-700 hover:text-plum-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600"
        >
          {cta}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </aside>
  );
}
