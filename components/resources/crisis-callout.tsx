import { LifeBuoy } from "lucide-react";
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
    <div className="mt-8 rounded-lg border border-rose-200/70 bg-rose-50/50 px-5 py-4">
      <p className="flex items-center gap-2 font-display text-lg font-medium text-plum-800">
        <LifeBuoy className="h-4 w-4 text-rose-500" aria-hidden="true" />
        {heading}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-charcoal-500">{body}</p>
      <Link
        href="/resources/crisis"
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium uppercase tracking-[0.12em] text-rose-700 transition-colors hover:text-rose-500"
      >
        {cta}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
