import type { PodcastEpisode } from "@/lib/data/podcast";
import { PodcastEpisodeCard } from "./podcast-episode-card";

type Labels = {
  comingSoon: string;
  minutes: string;
  advisoryStrong: string;
  advisoryMild: string;
};

/**
 * Featured episode in Phase B is rendered as a larger variant of the same card,
 * so when episode pages exist, both surfaces become links in lockstep.
 */
export function FeaturedEpisode({
  episode,
  locale,
  labels,
}: {
  episode: PodcastEpisode;
  locale: string;
  labels: Labels;
}) {
  return (
    <PodcastEpisodeCard
      episode={episode}
      locale={locale}
      labels={labels}
      variant="featured"
    />
  );
}