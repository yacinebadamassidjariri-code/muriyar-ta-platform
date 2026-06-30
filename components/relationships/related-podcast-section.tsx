import { Section } from "@/components/ui/section";
import { PodcastEpisodeCard } from "@/components/podcast/podcast-episode-card";
import type { PodcastEpisode } from "@/lib/data/podcast";

type Labels = {
  eyebrow: string;
  heading: string;
  description: string;
  cardMinutes: string;
  advisoryStrong: string;
  advisoryMild: string;
};

/**
 * Cross-content section: "Listen to the podcast" / "More episodes that
 * expand on this." Usable from Story pages, future Research pages, future
 * Campaign pages — anywhere a list of linked PodcastEpisodes makes sense.
 *
 * Hides entirely when episodes is empty. Reuses the existing PodcastEpisodeCard
 * so visual language stays consistent and links resolve to /podcast/[slug].
 */
export function RelatedPodcastSection({
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
      id="related-podcast"
      eyebrow={labels.eyebrow}
      title={labels.heading}
      description={labels.description}
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