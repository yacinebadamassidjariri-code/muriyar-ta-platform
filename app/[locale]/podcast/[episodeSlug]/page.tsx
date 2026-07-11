import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import {
  PODCAST_SERIES,
  type PodcastSeriesSlug,
} from "@/lib/content/podcast-series";
import {
  getEpisodeBySlug,
  getEpisodeThemes,
  getRelatedStoriesForEpisode,
  listSeriesEpisodes,
  listThemeEpisodes,
  listRelatedResources,
} from "@/lib/data/podcast";
import { PodcastMetadata } from "@/components/podcast/podcast-metadata";
import { PodcastPlayer } from "@/components/podcast/podcast-player";
import { PodcastTranscript } from "@/components/podcast/podcast-transcript";
import { PodcastSeriesRecommendations } from "@/components/podcast/podcast-series-recommendations";
import { PodcastThemeRecommendations } from "@/components/podcast/podcast-theme-recommendations";
import { RelatedStorySection } from "@/components/relationships/related-story-section";
import { RelatedResourcesSection } from "@/components/relationships/related-resources-section";
import type { StoryListItem } from "@/lib/data/stories";
import { ImageOff } from "lucide-react";
import { getPodcastPlaybackUrl } from "@/lib/data/podcast";

export const revalidate = 300;

function isKnownSeries(slug: string | null): slug is PodcastSeriesSlug {
  return !!slug && PODCAST_SERIES.some((s) => s.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; episodeSlug: string }>;
}): Promise<Metadata> {
  const { locale, episodeSlug } = await params;
  const ep = await getEpisodeBySlug(episodeSlug);
  if (!ep) {
    const t = await getTranslations({ locale, namespace: "podcast" });
    return { title: t("metaTitle") };
  }
  return {
    title: ep.title,
    description: ep.episode_summary || ep.description || undefined,
  };
}

export default async function PodcastEpisodePage({
  params,
}: {
  params: Promise<{ locale: string; episodeSlug: string }>;
}) {
  const { locale, episodeSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "podcast" });

  const episode = await getEpisodeBySlug(episodeSlug);
  if (!episode) notFound();

  const [audioPlayback, artworkPlayback] = await Promise.all([
  getPodcastPlaybackUrl(episode.episode_id, "audio"),
  getPodcastPlaybackUrl(episode.episode_id, "artwork"),
]);
  const audioUrl = audioPlayback?.signedUrl ?? episode.external_audio_url;
  const artworkUrl = artworkPlayback?.signedUrl ?? null;

  const seriesName = isKnownSeries(episode.series_slug)
    ? t(`series.${episode.series_slug}.name`)
    : null;

  const [themes, stories] = await Promise.all([
    getEpisodeThemes(episode.episode_id),
    getRelatedStoriesForEpisode(episode.episode_id),
  ]);

  const themeIds = themes.map((th) => th.tag_id);
  const themeNames = themes.map((th) => th.name);

  const [seriesEpisodes, themeEpisodes, relatedResources] = await Promise.all([
    episode.series_slug
      ? listSeriesEpisodes(episode.series_slug, episode.episode_id, locale, 3)
      : Promise.resolve([]),
    themeIds.length > 0
      ? listThemeEpisodes(themeIds, episode.episode_id, locale, 3)
      : Promise.resolve([]),
    themeNames.length > 0
      ? listRelatedResources(themeNames, 4)
      : Promise.resolve([]),
  ]);

  // Adapt RelatedStory[] (the podcast-side projection) → StoryListItem[]
  // (the canonical shape RelatedStorySection / StoryCard consume).
  const relatedStories: StoryListItem[] = stories.map((s) => ({
    story_id: s.story_id,
    title: s.title,
    slug: s.slug,
    language_code: s.language_code,
    seo_description: s.seo_description,
    body_text: s.body_text,
    published_at: s.published_at,
    tags: [],
  }));

  const cardMinutes = t("minutes");
  const advisoryStrong = t("advisoryStrong");
  const advisoryMild = t("advisoryMild");

  return (
    <article className="mx-auto w-full max-w-4xl px-4 pb-16">
      <Link
        href="/podcast"
        className="mt-8 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToPodcast")}
      </Link>

      {/* 1) Episode Hero */}
<header className="mt-6 mb-6 grid gap-6 md:grid-cols-[240px_1fr]">
  {/* Artwork */}
  <div className="order-first md:order-none">
    <div className="aspect-square w-full max-w-[240px] overflow-hidden rounded-xl border border-line bg-surface-muted">
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artworkUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-soft">
          <ImageOff className="h-10 w-10" aria-hidden="true" />
          <span className="sr-only">{t("artworkPlaceholderAlt")}</span>
        </div>
      )}
    </div>
  </div>

  {/* Metadata */}
  <div>
    <h1 className="text-3xl font-bold leading-tight text-ink md:text-4xl">
      {episode.title}
    </h1>
    {episode.episode_summary?.trim() || episode.description?.trim() ? (
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
        {episode.episode_summary?.trim() || episode.description?.trim()}
      </p>
    ) : null}
    <div className="mt-4">
      <PodcastMetadata
        seriesName={seriesName}
        languageCode={episode.language_code}
        durationSeconds={
          audioPlayback?.durationSeconds ?? episode.duration_seconds
        }
        publishedAt={episode.published_at}
        locale={locale}
        labels={{
          series: t("metaSeries"),
          language: t("metaLanguage"),
          duration: t("metaDuration"),
          minutes: cardMinutes,
          published: t("metaPublished"),
        }}
      />
    </div>
    {episode.content_advisory === "strong" ? (
      <p className="mt-4 inline-block rounded-md bg-danger/10 px-3 py-1.5 text-sm font-semibold text-danger">
        {t("advisoryStrong")}
      </p>
    ) : episode.content_advisory === "mild" ? (
      <p className="mt-4 inline-block rounded-md bg-surface-muted px-3 py-1.5 text-sm font-medium text-ink-soft">
        {t("advisoryMild")}
      </p>
    ) : null}
  </div>
</header>

      {/* 2) Player */}
      <PodcastPlayer
  audioUrl={audioUrl}
  title={episode.title}
  showDownload={false}
  labels={{
    unavailableTitle: t("playerUnavailableTitle"),
    unavailableBody: t("playerUnavailableBody"),
    download: t("playerDownload"),
  }}
/>

      {/* 3) Transcript */}
      <PodcastTranscript
        transcript={episode.transcript}
        status={episode.transcript_status}
        labels={{
          heading: t("transcriptHeading"),
          emptyTitle: t("transcriptEmptyTitle"),
          emptyBody: t("transcriptEmptyBody"),
          statusAuto: t("transcriptStatusAuto"),
          statusHuman: t("transcriptStatusHuman"),
          statusNone: t("transcriptStatusNone"),
          statusLabel: t("transcriptStatusLabel"),
        }}
      />

      {/* 4) About */}
      {episode.episode_summary?.trim() ? (
        <Section
          id="podcast-about"
          eyebrow={t("aboutEyebrow")}
          title={t("aboutTitle")}
        >
          <Card className="p-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">
              {episode.episode_summary}
            </p>
          </Card>
        </Section>
      ) : null}

      {/* 5) Podcast → Story (dedicated, editor-managed) */}
      <RelatedStorySection
        stories={relatedStories}
        locale={locale}
        labels={{
          eyebrow: t("relatedStoryEyebrow"),
          heading: t("relatedStoryHeading"),
          description: t("relatedStoryDescription"),
        }}
      />

      {/* 6) Podcast → Resources (theme-derived) */}
      <RelatedResourcesSection
        resources={relatedResources}
        labels={{
          eyebrow: t("relatedResourcesEyebrow"),
          heading: t("relatedResourcesHeading"),
          description: t("relatedResourcesDescription"),
          visit: t("relatedResourcesVisit"),
        }}
      />

      {/* 7) More from this Series — episode discovery, podcast-scoped */}
      {seriesName ? (
        <PodcastSeriesRecommendations
          episodes={seriesEpisodes}
          locale={locale}
          labels={{
            eyebrow: t("seriesRecsEyebrow"),
            heading: t("seriesRecsHeading", { series: seriesName }),
            cardMinutes,
            advisoryStrong,
            advisoryMild,
          }}
        />
      ) : null}

      {/* 8) More on this Theme — episode discovery */}
      <PodcastThemeRecommendations
        episodes={themeEpisodes}
        locale={locale}
        labels={{
          eyebrow: t("themeRecsEyebrow"),
          heading: t("themeRecsHeading"),
          cardMinutes,
          advisoryStrong,
          advisoryMild,
        }}
      />
    </article>
  );
}