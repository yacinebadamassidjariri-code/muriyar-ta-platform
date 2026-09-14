import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/lib/data/resources";
import styles from "./resources.module.css";

/**
 * Server-rendered category navigation driven entirely by URL params.
 * "All" clears the category. The page passes only the thematic categories
 * approved for public browsing; the complete category set remains available
 * to the CMS and data model.
 */
export function CategoryNav({
  categories,
  activeCategoryId,
  q,
  allLabel,
  ariaLabel,
  basePath = "/resources",
  showAll = true,
}: {
  categories: Category[];
  activeCategoryId: number | null;
  q?: string | null;
  allLabel: string;
  ariaLabel: string;
  basePath?: string;
  showAll?: boolean;
}) {
  function hrefFor(catId: number | null): string {
    const params = new URLSearchParams();
    if (catId != null) params.set("category", String(catId));
    if (q && q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav aria-label={ariaLabel}>
      <ul className={styles.categoryList}>
        {showAll ? <li>
          <Link
            href={hrefFor(null)}
            aria-current={activeCategoryId === null ? "page" : undefined}
            className={cn(
              styles.categoryLink,
              activeCategoryId === null && styles.categoryActive,
            )}
          >
            {allLabel}
          </Link>
        </li> : null}
        {categories.map((category) => (
          <li key={category.category_id}>
            <Link
              href={hrefFor(category.category_id)}
              aria-current={
                activeCategoryId === category.category_id ? "page" : undefined
              }
              className={cn(styles.categoryLink, activeCategoryId === category.category_id && styles.categoryActive)}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
