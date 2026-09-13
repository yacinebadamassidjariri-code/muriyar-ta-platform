import type { Metadata } from "next";
/* Signed artwork URLs are short-lived and cannot use a static Next Image host allowlist. */
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { PODCAST_SERIES, type PodcastSeriesSlug } from "@/lib/content/podcast-series";
import { getEpisodeBySlug, getEpisodeThemes, getRelatedStoriesForEpisode, listSeriesEpisodes, listThemeEpisodes, listRelatedResources, getPodcastPlaybackUrl, type PodcastEpisode } from "@/lib/data/podcast";
import { podcastEditorial } from "@/components/podcast/content";
import { PodcastMetadata } from "@/components/podcast/podcast-metadata";
import { PodcastPlayer } from "@/components/podcast/podcast-player";
import { PodcastTranscript } from "@/components/podcast/podcast-transcript";
import { EpisodeEntry } from "@/components/podcast/episode-entry";
import { PodcastRelatedStory } from "@/components/podcast/podcast-related-story";
import { PodcastRelatedResources } from "@/components/podcast/podcast-related-resources";
import styles from "@/components/podcast/podcast.module.css";

export const revalidate = 300;
function isKnownSeries(slug: string | null): slug is PodcastSeriesSlug { return !!slug && PODCAST_SERIES.some((series) => series.slug === slug); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; episodeSlug: string }> }): Promise<Metadata> { const { locale, episodeSlug } = await params; const episode = await getEpisodeBySlug(episodeSlug); if (!episode) { const t = await getTranslations({ locale, namespace: "podcast" }); return { title: t("metaTitle") }; } return { title: episode.title, description: episode.episode_summary || episode.description || undefined }; }

export default async function PodcastEpisodePage({ params }: { params: Promise<{ locale: string; episodeSlug: string }> }) {
  const { locale, episodeSlug } = await params; setRequestLocale(locale);
  const [t, tp, episode] = await Promise.all([getTranslations({ locale, namespace: "podcast" }), getTranslations({ locale }), getEpisodeBySlug(episodeSlug)]);
  if (!episode) notFound();
  const ed = podcastEditorial[locale as keyof typeof podcastEditorial] ?? podcastEditorial.en;
  const [audioPlayback, artworkPlayback, themes, stories] = await Promise.all([getPodcastPlaybackUrl(episode.episode_id, "audio"), getPodcastPlaybackUrl(episode.episode_id, "artwork"), getEpisodeThemes(episode.episode_id), getRelatedStoriesForEpisode(episode.episode_id)]);
  const audioUrl = audioPlayback?.signedUrl ?? episode.external_audio_url;
  const artworkUrl = artworkPlayback?.signedUrl ?? null;
  const seriesName = isKnownSeries(episode.series_slug) ? t(`series.${episode.series_slug}.name`) : null;
  const themeIds = themes.map((theme) => theme.tag_id); const themeNames = themes.map((theme) => theme.name);
  const [seriesEpisodes, themeEpisodes, relatedResources] = await Promise.all([
    episode.series_slug ? listSeriesEpisodes(episode.series_slug, episode.episode_id, locale, 3) : Promise.resolve([]),
    themeIds.length ? listThemeEpisodes(themeIds, episode.episode_id, locale, 3) : Promise.resolve([]),
    themeNames.length ? listRelatedResources(themeNames, 4) : Promise.resolve([]),
  ]);
  const seen = new Set<string>([episode.episode_id]); const moreEpisodes: PodcastEpisode[] = [];
  for (const candidate of [...seriesEpisodes, ...themeEpisodes]) if (!seen.has(candidate.episode_id)) { seen.add(candidate.episode_id); moreEpisodes.push(candidate); }
  const lead = episode.episode_summary?.trim() || episode.description?.trim() || "";
  const advisory = episode.content_advisory === "strong" ? t("advisoryStrong") : episode.content_advisory === "mild" ? t("advisoryMild") : null;
  const entryLabels = { listenSuffix: ed.listenSuffix, listenAction: ed.listenAction, advisoryStrong: t("advisoryStrong"), advisoryMild: t("advisoryMild") };

  return <div className={styles.page}><article className={styles.shell}>
    <Link href="/podcast" className={styles.back}>{tp("backToPodcast")}</Link>
    <header className={styles.episodeHeader}><div>{seriesName ? <p className={styles.eyebrow}>{seriesName}</p> : null}<h1>{episode.title}</h1><div style={{marginTop:"1rem"}}><PodcastMetadata seriesName={null} languageCode={episode.language_code} durationSeconds={audioPlayback?.durationSeconds ?? episode.duration_seconds} publishedAt={episode.published_at} locale={locale} labels={{series:tp("metaSeries"),language:tp("metaLanguage"),duration:tp("metaDuration"),minutes:ed.listenSuffix,published:tp("metaPublished")}} /></div>{advisory ? <p className={styles.advisory}>{advisory}</p> : null}{lead ? <p className={styles.lead}>{lead}</p> : null}</div>{artworkUrl ? <img src={artworkUrl} alt="" className={styles.artwork} /> : null}</header>
    <section aria-label={ed.listenAction} className={styles.playerSection}><p className={styles.playerLabel}>{ed.listenAction}</p><PodcastPlayer audioUrl={audioUrl} title={episode.title} showDownload={false} variant="public" labels={{unavailableTitle:tp("playerUnavailableTitle"),unavailableBody:tp("playerUnavailableBody"),download:tp("playerDownload")}} /></section>
    <PodcastTranscript transcript={episode.transcript} status={episode.transcript_status} variant="public" labels={{heading:tp("transcriptHeading"),emptyTitle:tp("transcriptEmptyTitle"),emptyBody:tp("transcriptEmptyBody"),statusAuto:tp("transcriptStatusAuto"),statusHuman:tp("transcriptStatusHuman"),statusNone:tp("transcriptStatusNone"),statusLabel:tp("transcriptStatusLabel")}} />
    <PodcastRelatedStory stories={stories} labels={{eyebrow:tp("relatedStoryEyebrow"),heading:ed.relatedVoices,description:tp("relatedStoryDescription"),cta:tp("relatedStoryCta")}} />
    <PodcastRelatedResources resources={relatedResources} labels={{eyebrow:tp("relatedResourcesEyebrow"),heading:ed.findSupport,description:tp("relatedResourcesDescription"),visit:tp("relatedResourcesVisit")}} />
    {moreEpisodes.length ? <section aria-labelledby="continue-listening" className={styles.continue}><h2 id="continue-listening">{ed.continueListening}</h2>{moreEpisodes.map((item) => <EpisodeEntry key={item.episode_id} episode={item} locale={locale} labels={entryLabels} />)}</section> : null}
  </article></div>;
}
