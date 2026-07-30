import { Link } from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

function pageHref(basePath: string, current: Record<string, string>, page: number) {
  const query = new URLSearchParams(
    Object.entries(current).filter(([, value]) => value),
  );
  if (page > 1) query.set("page", String(page));
  return query.size ? `${basePath}?${query}` : basePath;
}

export function EditorialPagination({
  basePath,
  current,
  page,
  pageCount,
  total,
  summary,
  previous,
  next,
}: {
  basePath: string;
  current: Record<string, string>;
  page: number;
  pageCount: number;
  total: number;
  summary: string;
  previous: string;
  next: string;
}) {
  const label = summary
    .replace("{page}", String(page))
    .replace("{pages}", String(pageCount))
    .replace("{total}", String(total));
  const unavailableClass =
    "rounded-md border border-line px-3 py-2 opacity-50";

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft"
    >
      <p>{label}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            className={buttonVariants({ variant: "secondary", size: "sm" })}
            href={pageHref(basePath, current, page - 1)}
          >
            {previous}
          </Link>
        ) : (
          <span aria-disabled="true" className={unavailableClass}>
            {previous}
          </span>
        )}
        {page < pageCount ? (
          <Link
            className={buttonVariants({ variant: "secondary", size: "sm" })}
            href={pageHref(basePath, current, page + 1)}
          >
            {next}
          </Link>
        ) : (
          <span aria-disabled="true" className={unavailableClass}>
            {next}
          </span>
        )}
      </div>
    </nav>
  );
}
