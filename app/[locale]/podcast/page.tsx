import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getFeaturedEpisode,
  listLatestEpisodes,
  listPodcastThemes,
} from "@/lib/data/podcast";
import { podcastEditorial } from "@/components/podcast/content";
import { PodcastHero } from "@/components/podcast/podcast-hero";
import { FeaturedEpisode } from "@/components/podcast/featured-episode";
import { EpisodeEntry } from "@/components/podcast/episode-entry";
import { PodcastSeriesGrid } from "@/components/podcast/podcast-series-grid";
import { PodcastThemeGrid } from "@/components/podcast/podcast-theme-grid";
import { PodcastLanguageGrid } from "@/components/podcast/podcast-language-grid";
import { PodcastEmptyState } from "@/components/podcast/podcast-empty-state";
import { BotanicalCorner, FloralSeparator } from "@/components/home/botanical";

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
  const ed =
    podcastEditorial[locale as keyof typeof podcastEditorial] ??
    podcastEditorial.en;

  const [featured, latest, themes] = await Promise.all([
    getFeaturedEpisode(locale),
    listLatestEpisodes(locale, 6),
    listPodcastThemes(locale, 8),
  ]);

  // Avoid showing the featured episode twice if the latest rail also includes it.
  const archive = featured
    ? latest.filter((e) => e.episode_id !== featured.episode_id)
    : latest;

  const hasEpisodes = !!featured || latest.length > 0;

  const featuredLabels = {
    comingSoon: t("episodeComingSoon"),
    minutes: t("minutes"),
    advisoryStrong: t("advisoryStrong"),
    advisoryMild: t("advisoryMild"),
  };
  const entryLabels = {
    listenSuffix: ed.listenSuffix,
    advisoryStrong: t("advisoryStrong"),
    advisoryMild: t("advisoryMild"),
  };

  return (
    <div className="relative mx-auto w-full max-w-3xl px-5 pb-20">
      <BotanicalCorner className="pointer-events-none absolute -right-4 top-10 hidden h-20 w-20 text-rose-200 md:block" />

      <PodcastHero locale={locale} purpose={ed.purpose} />

      {!hasEpisodes ? (
        <div className="mt-4">
          <PodcastEmptyState title={ed.emptyTitle} body={ed.emptyBody} />
        </div>
      ) : (
        <>
          {/* The transition: a quiet archival note hands the reader from the
              introduction into the archive of voices. */}
          <div>
            <p className="mx-auto max-w-md text-center font-display text-lg leading-relaxed text-plum-700 md:text-xl">
              {ed.archiveNote}
            </p>
            <FloralSeparator className="mt-8 text-rose-200" />
          </div>

          {featured ? (
            <div className="mt-14 md:mt-16">
              <FeaturedEpisode
                episode={featured}
                locale={locale}
                labels={featuredLabels}
              />
            </div>
          ) : null}

          {archive.length > 0 ? (
            <section aria-labelledby="podcast-archive" className="mt-16">
              <h2
                id="podcast-archive"
                className="font-display text-2xl font-medium text-plum-800"
              >
                {ed.archiveHeading}
              </h2>
              <div className="mt-2 divide-y divide-stone-200/60 border-t border-stone-200/60">
                {archive.map((ep) => (
                  <EpisodeEntry
                    key={ep.episode_id}
                    episode={ep}
                    locale={locale}
                    labels={entryLabels}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* Ways to explore — quiet, editorial, and honest that the platform grows. */}
      <FloralSeparator className="my-16 text-rose-200" />

      <section aria-labelledby="podcast-series" className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
          {t("seriesEyebrow")}
        </p>
        <h2
          id="podcast-series"
          className="mt-3 font-display text-2xl font-medium text-plum-800"
        >
          {t("seriesTitle")}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-charcoal-500">
          {t("seriesDescription")}
        </p>
        <div className="mt-8">
          <PodcastSeriesGrid locale={locale} />
        </div>
      </section>

      <section aria-labelledby="podcast-themes" className="mt-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
          {t("themesEyebrow")}
        </p>
        <h2
          id="podcast-themes"
          className="mt-3 font-display text-2xl font-medium text-plum-800"
        >
          {t("themesTitle")}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-charcoal-500">
          {t("themesDescription")}
        </p>
        <div className="mt-6">
          <PodcastThemeGrid themes={themes} locale={locale} />
        </div>
      </section>

      <section aria-labelledby="podcast-languages" className="mt-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
          {t("languagesEyebrow")}
        </p>
        <h2
          id="podcast-languages"
          className="mt-3 font-display text-2xl font-medium text-plum-800"
        >
          {t("languagesTitle")}
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-charcoal-500">
          {t("languagesDescription")}
        </p>
        <div className="mt-6">
          <PodcastLanguageGrid locale={locale} />
        </div>
      </section>

      <p className="mt-12 max-w-2xl leading-relaxed text-charcoal-500">
        {ed.growingNote}
      </p>
    </div>
  );
}
