import { Link } from "@/lib/i18n/navigation";
import { localeLabels, type Locale } from "@/lib/i18n/routing";
import type { PodcastEpisode } from "@/lib/data/podcast";
import { listeningMinutes } from "./content";
import styles from "./podcast.module.css";

type Labels = { listenSuffix: string; listenAction: string; startHere?: string; advisoryStrong: string; advisoryMild: string };
export function EpisodeEntry({ episode, locale, labels, lead = false }: { episode: PodcastEpisode; locale: string; labels: Labels; lead?: boolean }) {
  const date = new Intl.DateTimeFormat(locale === "zar" ? "en" : locale, { dateStyle: "medium" }).format(new Date(episode.published_at));
  const minutes = listeningMinutes(episode.duration_seconds);
  const language = localeLabels[episode.language_code as Locale] ?? episode.language_code;
  const summary = episode.episode_summary?.trim() || episode.description?.trim() || "";
  const advisory = episode.content_advisory === "strong" ? labels.advisoryStrong : episode.content_advisory === "mild" ? labels.advisoryMild : null;
  return <article className={`${styles.entry} ${lead ? styles.entryLead : ""}`}>
    <div>{lead && labels.startHere ? <p className={styles.entryLabel}>{labels.startHere}</p> : null}<h3><Link href={`/podcast/${episode.episode_id}`}>{episode.title}</Link></h3>{summary ? <p className={styles.entrySummary}>{summary}</p> : null}</div>
    <div className={styles.entrySide}><p className={styles.meta}><time dateTime={episode.published_at}>{date}</time><span>{language}</span>{minutes ? <span>{minutes} {labels.listenSuffix}</span> : null}{advisory ? <span>{advisory}</span> : null}</p><Link href={`/podcast/${episode.episode_id}`} className={styles.listenLink}>{labels.listenAction}</Link></div>
  </article>;
}
