import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFeaturedEpisode, listLatestEpisodes, listPodcastThemes } from "@/lib/data/podcast";
import { podcastEditorial } from "@/components/podcast/content";
import { PodcastHero } from "@/components/podcast/podcast-hero";
import { EpisodeEntry } from "@/components/podcast/episode-entry";
import { PodcastSeriesGrid } from "@/components/podcast/podcast-series-grid";
import { PodcastThemeGrid } from "@/components/podcast/podcast-theme-grid";
import { PodcastLanguageGrid } from "@/components/podcast/podcast-language-grid";
import { PodcastEmptyState } from "@/components/podcast/podcast-empty-state";
import styles from "@/components/podcast/podcast.module.css";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const t = await getTranslations({ locale, namespace: "podcast" }); return { title: t("metaTitle"), description: t("metaDescription") }; }

export default async function PodcastHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const ed = podcastEditorial[locale as keyof typeof podcastEditorial] ?? podcastEditorial.en;
  const [t, featured, latest, themes] = await Promise.all([getTranslations({ locale, namespace: "podcast" }), getFeaturedEpisode(locale), listLatestEpisodes(locale, 6), listPodcastThemes(locale, 8)]);
  const archive = featured ? latest.filter((episode) => episode.episode_id !== featured.episode_id) : latest;
  const labels = { listenSuffix: ed.listenSuffix, listenAction: ed.listenAction, startHere: ed.startHere, advisoryStrong: t("advisoryStrong"), advisoryMild: t("advisoryMild") };
  return <div className={styles.page}><div className={styles.shell}>
    <PodcastHero locale={locale} purpose={ed.purpose} />
    {featured || archive.length ? <section aria-labelledby="podcast-archive" className={styles.archive}><h2 id="podcast-archive" className={styles.sectionHeading}>{ed.archiveHeading}</h2>{featured ? <EpisodeEntry episode={featured} locale={locale} labels={labels} lead /> : null}{archive.map((episode) => <EpisodeEntry key={episode.episode_id} episode={episode} locale={locale} labels={labels} />)}</section> : <PodcastEmptyState title={ed.emptyTitle} body={ed.emptyBody} />}
    <section aria-labelledby="podcast-discovery" className={styles.discovery}><p className={styles.eyebrow}>{t("seriesEyebrow")}</p><h2 id="podcast-discovery">{ed.discoverHeading}</h2><PodcastSeriesGrid locale={locale} /><PodcastThemeGrid themes={themes} locale={locale} /><PodcastLanguageGrid locale={locale} /></section>
  </div></div>;
}
