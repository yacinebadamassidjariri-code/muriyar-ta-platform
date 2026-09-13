import { localeLabels, type Locale } from "@/lib/i18n/routing";
import { listeningMinutes } from "./content";
import styles from "./podcast.module.css";
type Labels = { series: string; language: string; duration: string; minutes: string; published: string };
export function PodcastMetadata({ seriesName, languageCode, durationSeconds, publishedAt, locale, labels }: { seriesName: string | null; languageCode: string; durationSeconds: number | null; publishedAt: string; locale: string; labels: Labels }) {
  const date = new Intl.DateTimeFormat(locale === "zar" ? "en" : locale, { dateStyle: "long" }).format(new Date(publishedAt));
  const minutes = listeningMinutes(durationSeconds); const language = localeLabels[languageCode as Locale] ?? languageCode;
  return <p className={styles.meta}>{seriesName ? <span><span className="sr-only">{labels.series}: </span>{seriesName}</span> : null}<span><span className="sr-only">{labels.language}: </span>{language}</span>{minutes ? <span><span className="sr-only">{labels.duration}: </span>{minutes} {labels.minutes}</span> : null}<time dateTime={publishedAt}><span className="sr-only">{labels.published}: </span>{date}</time></p>;
}
