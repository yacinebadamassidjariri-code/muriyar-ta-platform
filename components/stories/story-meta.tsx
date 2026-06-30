import { Badge } from "@/components/ui/badge";

/** "date · #tag #tag" — shared metadata row. Phase 1: date + tags only. */
export function StoryMeta({
  publishedAt,
  tags,
  locale,
}: {
  publishedAt: string;
  tags: { tag_id: number; name: string; slug: string }[];
  locale: string;
}) {
  const date = new Date(publishedAt);
  const intlLocale = locale === "zar" ? "en" : locale; // 'zar' isn't a guaranteed Intl tag
  const dateLabel = new Intl.DateTimeFormat(intlLocale, { dateStyle: "long" }).format(date);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
      <time dateTime={date.toISOString()}>{dateLabel}</time>
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.tag_id}>
              <Badge>{t.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}