import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PodcastTheme } from "@/lib/data/podcast";

/**
 * Browse-by-theme rail. Themes come from the DB (issue_tags actually used by
 * published episodes). Phase C will wrap each card in
 * <Link href={`/podcast/themes/${theme.slug}`}>.
 */
export async function PodcastThemeGrid({
  themes,
  locale,
}: {
  themes: PodcastTheme[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  if (themes.length === 0) {
    return (
      <p className="text-sm italic text-ink-soft">{t("themesEmpty")}</p>
    );
  }
  const comingSoon = t("comingSoon");
  return (
    <ul className="flex flex-wrap gap-2">
      {themes.map((th) => (
        <li key={th.tag_id}>
          <Card className="px-3 py-2">
            <span className="text-sm font-medium text-ink">{th.name}</span>
            <span className="ml-2 align-middle">
              <Badge>{comingSoon}</Badge>
            </span>
          </Card>
        </li>
      ))}
    </ul>
  );
}