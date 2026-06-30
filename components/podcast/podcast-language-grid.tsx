import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { locales, localeLabels, type Locale } from "@/lib/i18n/routing";

/**
 * Browse-by-language rail. Sourced from `lib/i18n/routing` so the four
 * languages stay in lockstep with the locale switcher. Phase C will turn
 * each into a link to /podcast/languages/[languageCode].
 */
export async function PodcastLanguageGrid({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "podcast" });
  const comingSoon = t("comingSoon");
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {(locales as readonly Locale[]).map((l) => (
        <li key={l}>
          <Card className="flex items-center justify-between p-5">
            <span className="font-medium text-ink">{localeLabels[l]}</span>
            <Badge>{comingSoon}</Badge>
          </Card>
        </li>
      ))}
    </ul>
  );
}