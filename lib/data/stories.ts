import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PodcastEpisode, RelatedResource } from "@/lib/data/podcast";

/**
 * The ONLY read path for public stories. Reads exclusively from
 * published_stories_public — which already filters status='published' and
 * omits source_submission_ref, status, and published_by.
 *
 * Phase 1 exports the list. Phase 2 adds detail-by-slug. Phase D appends
 * cross-content readers (theme attachment + linked podcast episodes +
 * theme-derived resources). All additive; nothing above is modified.
 */

export type StoryListItem = {
  story_id: string;
  title: string;
  slug: string;
  language_code: string;
  seo_description: string | null;
  body_text: string;
  published_at: string;
  tags: { tag_id: number; name: string; slug: string }[];
};

export type StoryDetail = StoryListItem & {
  seo_title: string | null;
  author_display: string;
};

type TagRow = { tag_id: number; name: string; slug: string };

const LIST_COLS =
  "story_id, title, slug, language_code, seo_description, body_text, published_at";

const DETAIL_COLS =
  "story_id, title, slug, language_code, seo_title, seo_description, body_text, author_display, published_at";

async function attachTagsList(
  rows: Omit<StoryListItem, "tags">[],
): Promise<StoryListItem[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const storyIds = rows.map((r) => r.story_id);

  const { data, error } = await supabase
    .from("published_story_tags")
    .select("story_id, issue_tags!inner(tag_id, name, slug)")
    .in("story_id", storyIds);

  if (error) return rows.map((r) => ({ ...r, tags: [] }));

  const byStory = new Map<string, TagRow[]>();
  for (const row of (data ?? []) as {
    story_id: string;
    issue_tags: TagRow | TagRow[];
  }[]) {
    const tag = Array.isArray(row.issue_tags) ? row.issue_tags[0] : row.issue_tags;
    if (!tag) continue;
    const list = byStory.get(row.story_id) ?? [];
    list.push(tag);
    byStory.set(row.story_id, list);
  }
  return rows.map((r) => ({ ...r, tags: byStory.get(r.story_id) ?? [] }));
}

/** Newest-first published stories for the active locale. */
export async function listPublishedStories(
  locale: string,
  limit = 24,
): Promise<StoryListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_stories_public")
    .select(LIST_COLS)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return attachTagsList(data as Omit<StoryListItem, "tags">[]);
}

/**
 * One story by its globally-unique slug. Returns null if not in
 * published_stories_public (which already filters status='published' and
 * omits source_submission_ref, status, and published_by).
 */
export async function getPublishedStoryBySlug(
  slug: string,
): Promise<StoryDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_stories_public")
    .select(DETAIL_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;

  // Reuse the tag join via a one-row list.
  const [withTags] = await attachTagsList([data as Omit<StoryListItem, "tags">]);
  return {
    ...(withTags as StoryListItem),
    seo_title: (data as { seo_title: string | null }).seo_title,
    author_display: (data as { author_display: string }).author_display,
  };
}

// ---------------------------------------------------------------------------
// Phase D additions — Story-side cross-content readers (additive only)
// ---------------------------------------------------------------------------

type StoryTheme = { tag_id: number; name: string; slug: string };

const PODCAST_LIST_COLS_FOR_STORY =
  "episode_id, episode_number, title, description, episode_summary, " +
  "audio_asset_id, external_audio_url, duration_seconds, cover_art_asset_id, " +
  "language_code, published_at, series_slug, episode_kind, content_advisory, " +
  "transcript_status";

/** Theme ids+names attached to one published story. */
export async function getStoryThemes(
  storyId: string,
): Promise<StoryTheme[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_story_tags")
    .select("issue_tags!inner(tag_id, name, slug)")
    .eq("story_id", storyId);
  if (error || !data) return [];
  type Row = { issue_tags: StoryTheme | StoryTheme[] };
  return (data as Row[])
    .map((r) => (Array.isArray(r.issue_tags) ? r.issue_tags[0] : r.issue_tags))
    .filter((t): t is StoryTheme => !!t)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Podcast episodes explicitly linked to this story via podcast_episode_stories.
 * Reads only podcast_episodes_public so drafts/archived never surface and only
 * episodes in the active locale are returned.
 */
export async function getRelatedPodcastEpisodesForStory(
  storyId: string,
  locale: string,
  limit = 6,
): Promise<PodcastEpisode[]> {
  const supabase = await createClient();

  // Episode ids linked to this story.
  const { data: links, error: lerr } = await supabase
    .from("podcast_episode_stories")
    .select("episode_id")
    .eq("story_id", storyId);
  if (lerr || !links || links.length === 0) return [];

  const episodeIds = (links as { episode_id: string }[]).map((l) => l.episode_id);

  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(PODCAST_LIST_COLS_FOR_STORY)
    .in("episode_id", episodeIds)
    .eq("language_code", locale)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as PodcastEpisode[];
}

/**
 * Resources for a story, theme-derived (same pattern as the podcast page):
 * resources whose category name matches one of the story's theme names.
 * Reads only resources_public.
 *
 * Designed so a future explicit pin join can replace the body without
 * touching the call site.
 */
export async function getRelatedResourcesForStory(
  storyId: string,
  limit = 4,
): Promise<RelatedResource[]> {
  const themes = await getStoryThemes(storyId);
  if (themes.length === 0) return [];

  const supabase = await createClient();
  const lowered = themes.map((t) => t.name.toLowerCase());

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
    .overlaps("category_ids", matchedIds)
    .order("name", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as RelatedResource[];
}
