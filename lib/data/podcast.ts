import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The ONLY read path for public podcast data. Reads exclusively from
 * `podcast_episodes_public` (which filters status='published' and omits
 * staff-only columns like `participants` and `is_featured`).
 *
 * Phase B exports (kept stable):
 *   - PodcastEpisode, PodcastTheme types
 *   - listLatestEpisodes, getFeaturedEpisode, listPodcastThemes
 *
 * Phase C additions (this file):
 *   - PodcastEpisodeDetail (list shape + transcript + chapters)
 *   - RelatedStory, RelatedResource
 *   - getEpisodeBySlug
 *   - getEpisodeThemes
 *   - getRelatedStoriesForEpisode  (reads published_stories_public)
 *   - listSeriesEpisodes
 *   - listThemeEpisodes
 *   - listRelatedResources         (soft theme-name derivation today;
 *                                   swap to an explicit pin join later
 *                                   without touching callers)
 */

export type PodcastEpisode = {
  episode_id: string;
  episode_number: number | null;
  title: string;
  description: string | null;
  episode_summary: string | null;
  audio_asset_id: string | null;
  external_audio_url: string | null;
  duration_seconds: number | null;
  cover_art_asset_id: string | null;
  language_code: string;
  published_at: string;
  series_slug: string | null;
  episode_kind: "story" | "discussion" | "taboo_topic" | "roundtable" | null;
  content_advisory: "none" | "mild" | "strong";
  transcript_status: "none" | "auto" | "human_reviewed";
};

export type PodcastEpisodeDetail = PodcastEpisode & {
  transcript: string | null;
  chapters: { start_seconds: number; title: string }[] | null;
};

export type PodcastTheme = {
  tag_id: number;
  name: string;
  slug: string;
};

export type RelatedStory = {
  story_id: string;
  slug: string;
  title: string;
  seo_description: string | null;
  body_text: string;
  language_code: string;
  published_at: string;
};

export type RelatedResource = {
  resource_id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  contact_phone: string | null;
};

const LIST_COLS =
  "episode_id, episode_number, title, description, episode_summary, " +
  "audio_asset_id, external_audio_url, duration_seconds, cover_art_asset_id, " +
  "language_code, published_at, series_slug, episode_kind, content_advisory, " +
  "transcript_status";

const DETAIL_COLS = LIST_COLS + ", transcript, chapters";

// ---------------------------------------------------------------------------
// Phase B exports (bodies unchanged)
// ---------------------------------------------------------------------------

export async function listLatestEpisodes(
  locale: string,
  limit = 6,
): Promise<PodcastEpisode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(LIST_COLS)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as PodcastEpisode[];
}

export async function getFeaturedEpisode(
  locale: string,
): Promise<PodcastEpisode | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(LIST_COLS)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PodcastEpisode;
}

export async function listPodcastThemes(
  locale: string,
  limit = 8,
): Promise<PodcastTheme[]> {
  const supabase = await createClient();
  const { data: episodes, error: epErr } = await supabase
    .from("podcast_episodes_public")
    .select("episode_id")
    .eq("language_code", locale);
  if (epErr || !episodes || episodes.length === 0) return [];

  const episodeIds = (episodes as { episode_id: string }[]).map(
    (e) => e.episode_id,
  );

  const { data, error } = await supabase
    .from("podcast_episode_tags")
    .select("issue_tags!inner(tag_id, name, slug)")
    .in("episode_id", episodeIds);
  if (error || !data) return [];

  type Row = { issue_tags: PodcastTheme | PodcastTheme[] };
  const seen = new Map<number, PodcastTheme>();
  for (const row of data as Row[]) {
    const t = Array.isArray(row.issue_tags) ? row.issue_tags[0] : row.issue_tags;
    if (t && !seen.has(t.tag_id)) seen.set(t.tag_id, t);
  }
  return Array.from(seen.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Phase C additions
// ---------------------------------------------------------------------------

/**
 * One episode by slug. Until a `slug` column lands on podcast_episodes, the
 * route param resolves against episode_id (uuid). Swap the `.eq` field later
 * with no other change to callers.
 */
export async function getEpisodeBySlug(
  episodeSlug: string,
): Promise<PodcastEpisodeDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(DETAIL_COLS)
    .eq("episode_id", episodeSlug)
    .maybeSingle();
  if (error || !data) return null;
  return data as PodcastEpisodeDetail;
}

/** Themes attached to one episode, ordered by name. */
export async function getEpisodeThemes(
  episodeId: string,
): Promise<PodcastTheme[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episode_tags")
    .select("issue_tags!inner(tag_id, name, slug)")
    .eq("episode_id", episodeId);
  if (error || !data) return [];
  type Row = { issue_tags: PodcastTheme | PodcastTheme[] };
  return (data as Row[])
    .map((r) => (Array.isArray(r.issue_tags) ? r.issue_tags[0] : r.issue_tags))
    .filter((t): t is PodcastTheme => !!t)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Stories linked to this episode via podcast_episode_stories.
 * Joins to published_stories_public so drafts/archived never surface and
 * source_submission_ref stays omitted by view construction.
 */
export async function getRelatedStoriesForEpisode(
  episodeId: string,
): Promise<RelatedStory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episode_stories")
    .select(
      "published_stories_public!inner(" +
        "story_id, slug, title, seo_description, body_text, language_code, published_at" +
        ")",
    )
    .eq("episode_id", episodeId);
  if (error || !data) return [];

  type Row = { published_stories_public: RelatedStory | RelatedStory[] };
  return (data as Row[])
    .map((r) =>
      Array.isArray(r.published_stories_public)
        ? r.published_stories_public[0]
        : r.published_stories_public,
    )
    .filter((s): s is RelatedStory => !!s)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
}

/** More from the same series (locale-scoped, excludes the current episode). */
export async function listSeriesEpisodes(
  seriesSlug: string,
  excludeEpisodeId: string | null,
  locale: string,
  limit = 3,
): Promise<PodcastEpisode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(LIST_COLS)
    .eq("series_slug", seriesSlug)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(limit + (excludeEpisodeId ? 1 : 0));
  if (error || !data) return [];
  const rows = data as PodcastEpisode[];
  return excludeEpisodeId
    ? rows.filter((e) => e.episode_id !== excludeEpisodeId).slice(0, limit)
    : rows.slice(0, limit);
}

/** More on the same themes (distinct, locale-scoped, excludes current). */
export async function listThemeEpisodes(
  themeIds: number[],
  excludeEpisodeId: string | null,
  locale: string,
  limit = 3,
): Promise<PodcastEpisode[]> {
  if (themeIds.length === 0) return [];
  const supabase = await createClient();

  const { data: links, error: lerr } = await supabase
    .from("podcast_episode_tags")
    .select("episode_id")
    .in("tag_id", themeIds);
  if (lerr || !links) return [];

  const ids = Array.from(
    new Set(
      (links as { episode_id: string }[])
        .map((l) => l.episode_id)
        .filter((id) => id !== excludeEpisodeId),
    ),
  );
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(LIST_COLS)
    .in("episode_id", ids)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as PodcastEpisode[];
}

/**
 * Resources whose category name matches any of the episode's theme names
 * (case-insensitive). Reads `resources_public`. Replace the body with an
 * explicit `podcast_episode_resources` join later without touching callers.
 */
export async function listRelatedResources(
  themeNames: string[],
  limit = 4,
): Promise<RelatedResource[]> {
  if (themeNames.length === 0) return [];
  const supabase = await createClient();

  const lowered = themeNames.map((n) => n.toLowerCase());

  const { data: cats, error: cerr } = await supabase
    .from("resource_categories")
    .select("category_id, name");
  if (cerr || !cats) return [];

  const matchedIds = (cats as { category_id: number; name: string }[])
    .filter((c) => lowered.includes(c.name.toLowerCase()))
    .map((c) => c.category_id);
  if (matchedIds.length === 0) return [];

  const { data, error } = await supabase
    .from("resources_public")
    .select("resource_id, name, description, website_url, contact_phone")
    .in("category_id", matchedIds)
    .order("name", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as RelatedResource[];
}