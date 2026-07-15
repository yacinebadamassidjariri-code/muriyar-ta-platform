import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
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
  getPodcastPlaybackUrl,
  type PodcastEpisode,
} from "@/lib/data/podcast";
import { podcastEditorial } from "@/components/podcast/content";
import { PodcastMetadata } from "@/components/podcast/podcast-metadata";
import { PodcastPlayer } from "@/components/podcast/podcast-player";
import { PodcastTranscript } from "@/components/podcast/podcast-transcript";
import { EpisodeEntry } from "@/components/podcast/episode-entry";
import { PodcastRelatedStory } from "@/components/podcast/podcast-related-story";
import { PodcastRelatedResources } from "@/components/podcast/podcast-related-resources";
import { FloralSeparator } from "@/components/home/botanical";

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
  // `t` scopes to the `podcast` namespace; `tp` reads the episode-page labels
  // that live at the top level of the message files (unchanged catalogs).
  const t = await getTranslations({ locale, namespace: "podcast" });
  const tp = await getTranslations({ locale });
  const ed =
    podcastEditorial[locale as keyof typeof podcastEditorial] ??
    podcastEditorial.en;

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

  // One quiet "Continue listening" list: series + theme discovery, deduped.
  const seen = new Set<string>([episode.episode_id]);
  const moreEpisodes: PodcastEpisode[] = [];
  for (const ep of [...seriesEpisodes, ...themeEpisodes]) {
    if (!seen.has(ep.episode_id)) {
      seen.add(ep.episode_id);
      moreEpisodes.push(ep);
    }
  }

  const lead =
    episode.episode_summary?.trim() || episode.description?.trim() || "";
  const advisory =
    episode.content_advisory === "strong"
      ? t("advisoryStrong")
      : episode.content_advisory === "mild"
        ? t("advisoryMild")
        : null;

  const entryLabels = {
    listenSuffix: ed.listenSuffix,
    advisoryStrong: t("advisoryStrong"),
    advisoryMild: t("advisoryMild"),
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pb-20">
      <Link
        href="/podcast"
        className="mt-10 inline-flex items-center gap-1 text-sm text-charcoal-500 transition-colors hover:text-plum-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tp("backToPodcast")}
      </Link>

      {/* Episode hero: title and introduction dominate; metadata stays quiet. */}
      <header className="mt-8">
        {seriesName ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum-600">
            {seriesName}
          </p>
        ) : null}
        <h1 className="mt-3 font-display text-3xl font-medium leading-tight text-plum-800 md:text-[2.6rem]">
          {episode.title}
        </h1>
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
              series: tp("metaSeries"),
              language: tp("metaLanguage"),
              duration: tp("metaDuration"),
              minutes: ed.listenSuffix,
              published: tp("metaPublished"),
            }}
          />
        </div>
        {advisory ? (
          <p className="mt-3 text-sm text-charcoal-500">{advisory}</p>
        ) : null}
        {lead ? (
          <p className="mt-6 text-lg leading-relaxed text-charcoal-500">
            {lead}
          </p>
        ) : null}
        {artworkUrl ? (
          <div className="mt-8 max-w-[240px] overflow-hidden rounded-sm border border-stone-200/70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artworkUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </header>

      <FloralSeparator className="my-10 w-40 max-w-full text-rose-200" />

      {/* Invitation, then the player — the player supports the story. */}
      <p className="font-display text-lg text-plum-700">{ed.listenInvite}</p>
      <div className="mt-3">
        <PodcastPlayer
          audioUrl={audioUrl}
          title={episode.title}
          showDownload={false}
          labels={{
            unavailableTitle: tp("playerUnavailableTitle"),
            unavailableBody: tp("playerUnavailableBody"),
            download: tp("playerDownload"),
          }}
        />
      </div>

      {/* Transcript as a continuation of the reading experience. */}
      <PodcastTranscript
        transcript={episode.transcript}
        status={episode.transcript_status}
        labels={{
          heading: tp("transcriptHeading"),
          emptyTitle: tp("transcriptEmptyTitle"),
          emptyBody: tp("transcriptEmptyBody"),
          statusAuto: tp("transcriptStatusAuto"),
          statusHuman: tp("transcriptStatusHuman"),
          statusNone: tp("transcriptStatusNone"),
          statusLabel: tp("transcriptStatusLabel"),
        }}
      />

      {/* Related voices — the anonymous stories behind this episode. */}
      <PodcastRelatedStory
        stories={stories}
        labels={{
          eyebrow: tp("relatedStoryEyebrow"),
          heading: ed.relatedVoices,
          description: tp("relatedStoryDescription"),
          cta: tp("relatedStoryCta"),
        }}
      />

      {/* Find support — theme-derived resources. */}
      <PodcastRelatedResources
        resources={relatedResources}
        labels={{
          eyebrow: tp("relatedResourcesEyebrow"),
          heading: ed.findSupport,
          description: tp("relatedResourcesDescription"),
          visit: tp("relatedResourcesVisit"),
        }}
      />

      {/* Continue listening — gently onward to the next episode. */}
      {moreEpisodes.length > 0 ? (
        <section aria-labelledby="continue-listening" className="mt-14">
          <h2
            id="continue-listening"
            className="font-display text-2xl font-medium text-plum-800 md:text-3xl"
          >
            {ed.continueListening}
          </h2>
          <div className="mt-2 divide-y divide-stone-200/60 border-t border-stone-200/60">
            {moreEpisodes.map((ep) => (
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
    </article>
  );
}
