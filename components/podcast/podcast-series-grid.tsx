import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPodcastSeries } from "@/lib/content/podcast-series";

/**
 * Browse-by-series rail. Four code-config series, names/taglines translated.
 * Phase B: static cards (the series detail pages don't exist yet).
 * Phase C: each Card is wrapped in <Link href={`/podcast/series/${slug}`}>.
 */
export async function PodcastSeriesGrid({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  const series = getPodcastSeries();
  const comingSoon = t("comingSoon");

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {series.map((s) => (
        <li key={s.slug}>
          <Card className="flex h-full flex-col gap-3 p-5">
            <h3 className="text-lg font-semibold text-ink">
              {t(`series.${s.slug}.name`)}
            </h3>
            <p className="text-sm text-ink-soft">
              {t(`series.${s.slug}.tagline`)}
            </p>
            <div className="mt-auto pt-2">
              <Badge>{comingSoon}</Badge>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}