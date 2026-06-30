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
  basePath = "/resources",
}: {
  categories: Category[];
  activeCategoryId: number | null;
  q?: string | null;
  allLabel: string;
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
    "rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:bg-brand-50";
  const active = "border-brand-100 bg-brand-50 text-brand-800 font-medium";

  return (
    <nav aria-label="Resource categories" className="flex flex-wrap gap-2">
      <Link
        href={hrefFor(null)}
        aria-current={activeCategoryId === null ? "page" : undefined}
        className={cn(item, activeCategoryId === null && active)}
      >
        {allLabel}
      </Link>
      {categories.map((c) => (
        <Link
          key={c.category_id}
          href={hrefFor(c.category_id)}
          aria-current={activeCategoryId === c.category_id ? "page" : undefined}
          className={cn(item, activeCategoryId === c.category_id && active)}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}