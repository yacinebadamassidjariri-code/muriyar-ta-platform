import "server-only";

/**
 * Editorial series live as code configuration (per the approved architecture).
 * The DB never has a podcast_series table; episodes reference series by slug.
 *
 * UI strings (name, tagline, description) are NOT translated here — those live
 * in the next-intl catalogs under `podcast.series.<slug>.*`, so this file stays
 * a pure source of truth for the *set* of series and their stable identities.
 *
 * Migration path to a DB table (much later) is straightforward: copy these
 * rows into `podcast_series` and replace the import with a query. Episodes
 * don't need to change because they reference series by slug.
 */
export type PodcastSeriesSlug =
  | "anonymous-voices"
  | "beyond-the-story"
  | "breaking-the-silence"
  | "youth-voices";

export type PodcastSeriesConfig = {
  slug: PodcastSeriesSlug;
  // Sort order on the home (and elsewhere). Lower = earlier.
  sortOrder: number;
};

export const PODCAST_SERIES: PodcastSeriesConfig[] = [
  { slug: "anonymous-voices",     sortOrder: 1 },
  { slug: "beyond-the-story",     sortOrder: 2 },
  { slug: "breaking-the-silence", sortOrder: 3 },
  { slug: "youth-voices",         sortOrder: 4 },
];

export function getPodcastSeries(): PodcastSeriesConfig[] {
  return [...PODCAST_SERIES].sort((a, b) => a.sortOrder - b.sortOrder);
}