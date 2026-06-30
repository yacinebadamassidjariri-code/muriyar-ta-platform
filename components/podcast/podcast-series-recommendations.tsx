import { Section } from "@/components/ui/section";
import { PodcastEpisodeCard } from "./podcast-episode-card";
import type { PodcastEpisode } from "@/lib/data/podcast";

type Labels = {
  eyebrow: string;
  heading: string;          // already-formatted: "More from {series}"
  cardMinutes: string;
  advisoryStrong: string;
  advisoryMild: string;
};

export function PodcastSeriesRecommendations({
  episodes,
  locale,
  labels,
}: {
  episodes: PodcastEpisode[];
  locale: string;
  labels: Labels;
}) {
  if (episodes.length === 0) return null;

  const cardLabels = {
    minutes: labels.cardMinutes,
    advisoryStrong: labels.advisoryStrong,
    advisoryMild: labels.advisoryMild,
  };

  return (
    <Section
      id="podcast-series-recs"
      eyebrow={labels.eyebrow}
      title={labels.heading}
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map((ep) => (
          <li key={ep.episode_id}>
            <PodcastEpisodeCard episode={ep} locale={locale} labels={cardLabels} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
