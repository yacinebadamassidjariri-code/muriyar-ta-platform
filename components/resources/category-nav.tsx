import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/lib/data/resources";

/**
 * Server-rendered category navigation driven entirely by URL params.
 * "All" link clears the category. Categories come straight from the DB
 * (resource_categories) so new ones appear automatically.
 */
export function CategoryNav({
  categories,
  activeCategoryId,
  q,
  allLabel,
  ariaLabel,
  descriptions,
  basePath = "/resources",
}: {
  categories: Category[];
  activeCategoryId: number | null;
  q?: string | null;
  allLabel: string;
  ariaLabel: string;
  descriptions: Record<string, string>;
  basePath?: string;
}) {
  function hrefFor(catId: number | null): string {
    const params = new URLSearchParams();
    if (catId != null) params.set("category", String(catId));
    if (q && q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const item =
    "group flex min-h-28 items-start justify-between gap-5 border-b border-stone-200 py-6 text-left transition-colors duration-200 hover:text-plum-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum-600 sm:min-h-36 sm:py-7";
  const active = "border-rose-400 bg-rose-50/60 px-4 text-plum-800";

  return (
    <nav aria-label={ariaLabel}>
      <ul className="grid border-t border-stone-200 sm:grid-cols-2">
        <li className="sm:pr-8">
          <Link
            href={hrefFor(null)}
            aria-current={activeCategoryId === null ? "page" : undefined}
            className={cn(item, activeCategoryId === null && active)}
          >
            <span className="font-display text-2xl font-medium leading-tight text-plum-900">
              {allLabel}
            </span>
            <span
              aria-hidden="true"
              className="mt-1 shrink-0 text-rose-500 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
            >
              →
            </span>
          </Link>
        </li>
        {categories.map((category, index) => (
          <li
            key={category.category_id}
            className={cn(
              index % 2 === 0
                ? "sm:border-l sm:border-stone-200 sm:pl-8"
                : "sm:pr-8",
            )}
          >
            <Link
              href={hrefFor(category.category_id)}
              aria-current={
                activeCategoryId === category.category_id ? "page" : undefined
              }
              className={cn(
                item,
                activeCategoryId === category.category_id && active,
              )}
            >
              <span className="min-w-0">
                <span className="block font-display text-2xl font-medium leading-tight text-plum-900">
                  {category.name}
                </span>
                {descriptions[category.slug] ? (
                  <span className="mt-2 block text-sm leading-relaxed text-charcoal-500">
                    {descriptions[category.slug]}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="mt-1 shrink-0 text-rose-500 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
