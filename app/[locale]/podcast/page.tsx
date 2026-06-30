import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Section } from "@/components/ui/section";
import {
  getFeaturedEpisode,
  listLatestEpisodes,
  listPodcastThemes,
} from "@/lib/data/podcast";
import { PodcastHero } from "@/components/podcast/podcast-hero";
import { FeaturedEpisode } from "@/components/podcast/featured-episode";
import { PodcastEpisodeCard } from "@/components/podcast/podcast-episode-card";
import { PodcastSeriesGrid } from "@/components/podcast/podcast-series-grid";
import { PodcastThemeGrid } from "@/components/podcast/podcast-theme-grid";
import { PodcastLanguageGrid } from "@/components/podcast/podcast-language-grid";
import { PodcastEmptyState } from "@/components/podcast/podcast-empty-state";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "podcast" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PodcastHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "podcast" });

  const [featured, latest, themes] = await Promise.all([
    getFeaturedEpisode(locale),
    listLatestEpisodes(locale, 6),
    listPodcastThemes(locale, 8),
  ]);

  const cardLabels = {
    comingSoon: t("episodeComingSoon"),
    minutes: t("minutes"),
    advisoryStrong: t("advisoryStrong"),
    advisoryMild: t("advisoryMild"),
  };

  // Avoid showing the featured episode twice if the latest rail also includes it.
  const latestExcludingFeatured = featured
    ? latest.filter((e) => e.episode_id !== featured.episode_id)
    : latest;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <PodcastHero locale={locale} />

      {/* Featured */}
      <Section
        id="podcast-featured"
        eyebrow={t("featuredEyebrow")}
        title={t("featuredTitle")}
      >
        {featured ? (
          <FeaturedEpisode episode={featured} locale={locale} labels={cardLabels} />
        ) : (
          <PodcastEmptyState
            title={t("featuredEmptyTitle")}
            body={t("featuredEmptyBody")}
          />
        )}
      </Section>

      {/* Browse by Series */}
      <Section
        id="podcast-series"
        eyebrow={t("seriesEyebrow")}
        title={t("seriesTitle")}
        description={t("seriesDescription")}
      >
        <PodcastSeriesGrid locale={locale} />
      </Section>

      {/* Browse by Theme */}
      <Section
        id="podcast-themes"
        eyebrow={t("themesEyebrow")}
        title={t("themesTitle")}
        description={t("themesDescription")}
      >
        <PodcastThemeGrid themes={themes} locale={locale} />
      </Section>

      {/* Browse by Language */}
      <Section
        id="podcast-languages"
        eyebrow={t("languagesEyebrow")}
        title={t("languagesTitle")}
        description={t("languagesDescription")}
      >
        <PodcastLanguageGrid locale={locale} />
      </Section>

      {/* Latest episodes */}
      <Section
        id="podcast-latest"
        eyebrow={t("latestEyebrow")}
        title={t("latestTitle")}
      >
        {latestExcludingFeatured.length === 0 ? (
          <PodcastEmptyState
            title={t("latestEmptyTitle")}
            body={t("latestEmptyBody")}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestExcludingFeatured.map((ep) => (
              <li key={ep.episode_id}>
                <PodcastEpisodeCard
                  episode={ep}
                  locale={locale}
                  labels={cardLabels}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}