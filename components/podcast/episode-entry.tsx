import { Link } from "@/lib/i18n/navigation";
import type { PodcastEpisode } from "@/lib/data/podcast";
import { listeningMinutes } from "./content";

type Labels = {
  listenSuffix: string;
  advisoryStrong: string;
  advisoryMild: string;
};

/**
 * One episode in the archive — typography-first, no card. Every entry shares
 * this exact treatment (same title scale, a genuine summary, the same quiet
 * metadata) so no episode reads as more or less important than another. Rhythm
 * on the page comes from spacing and the hairline divider above each entry.
 *
 * Links preserve the existing target (`/podcast/{episode_id}`), unchanged.
 */
export function EpisodeEntry({
  episode,
  locale,
  labels,
}: {
  episode: PodcastEpisode;
  locale: string;
  labels: Labels;
}) {
  const intlLocale = locale === "zar" ? "en" : locale;
  const date = new Date(episode.published_at);
  const dateLabel = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "long",
  }).format(date);
  const minutes = listeningMinutes(episode.duration_seconds);
  const summary =
    episode.episode_summary?.trim() || episode.description?.trim() || "";
  const advisory =
    episode.content_advisory === "strong"
      ? labels.advisoryStrong
      : episode.content_advisory === "mild"
        ? labels.advisoryMild
        : null;

  return (
    <article className="py-10">
      <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
        <time dateTime={date.toISOString()}>{dateLabel}</time>
        {minutes ? " · " + minutes + " " + labels.listenSuffix : null}
        {advisory ? " · " + advisory : null}
      </p>
      <h3 className="mt-3 font-display text-2xl font-medium leading-snug text-plum-800">
        <Link
          href={`/podcast/${episode.episode_id}`}
          className="transition-colors hover:text-plum-900"
        >
          {episode.title}
        </Link>
      </h3>
      {summary ? (
        <p className="mt-3 leading-relaxed text-charcoal-500">{summary}</p>
      ) : null}
    </article>
  );
}
