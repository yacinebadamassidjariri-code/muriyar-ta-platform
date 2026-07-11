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
  return data as unknown as PodcastEpisode[];
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
  return data as unknown as PodcastEpisode;
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
 * Strict UUID v1–v5 shape check. Used only to decide which column to query
 * first. Slugs in this project are constrained to ^[a-z0-9-]+$ (migration 0017
 * CHECK), so the two namespaces never collide.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeUUID(identifier: string): boolean {
  return UUID_RE.test(identifier);
}

/**
 * One episode by either its slug or its UUID. During the migration window,
 * both forms of public URL are accepted so existing bookmarked UUID links
 * keep working while new slug URLs roll out. Both branches read exclusively
 * from `podcast_episodes_public` (which filters status='published' and omits
 * internal columns), so drafts/archived/private data can never surface.
 *
 * Performance: at most one query for the common case (slug or known-UUID);
 * two queries only when the identifier is UUID-shaped but does not match
 * any row, in which case we fall through to a slug lookup.
 *
 * Behavior is intentionally unchanged when nothing matches: returns null.
 */
export async function getEpisodeBySlug(
  identifier: string,
): Promise<PodcastEpisodeDetail | null> {
  const supabase = await createClient();

  if (looksLikeUUID(identifier)) {
    const { data, error } = await supabase
      .from("podcast_episodes_public")
      .select(DETAIL_COLS)
      .eq("episode_id", identifier)
      .maybeSingle();
    if (!error && data) {
      return data as unknown as PodcastEpisodeDetail;
    }
    // Fall through: UUID-shaped but no row — try slug as a last resort.
  }

  const { data, error } = await supabase
    .from("podcast_episodes_public")
    .select(DETAIL_COLS)
    .eq("slug", identifier)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as PodcastEpisodeDetail;
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
  return (data as unknown as Row[])
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
  const rows = data as unknown as PodcastEpisode[];
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
  return data as unknown as PodcastEpisode[];
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

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Signed URL TTL for public media playback. One hour is long enough to
 * cover a listen session and short enough that an unpublish invalidates
 * within an acceptable window.
 */
const PLAYBACK_URL_TTL_SECONDS = 3600;

export type MediaPlayback = {
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
};

/**
 * Public-side playback URL for a media asset (audio or artwork). Enforces:
 *   - episode is published
 *   - referenced asset is 'ready' and of the requested kind
 * via the SECURITY DEFINER RPC `get_podcast_media_playback_url`, then
 * generates a signed download URL from Storage.
 *
 * Returns null for anything the RPC gates out (draft, missing, wrong kind).
 * Never throws on ordinary "not visible" cases.
 */
export async function getPodcastPlaybackUrl(
  episodeId: string,
  kind: "audio" | "artwork",
): Promise<MediaPlayback | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_podcast_media_playback_url", {
    p_episode_id: episodeId,
    p_kind: kind,
  });
  if (error || !data) return null;

  const row = data as {
    storage_bucket: string;
    storage_path: string;
    mime_type: string;
    size_bytes: number;
    duration_seconds: number | null;
  };

  // The RPC returns storage coordinates; the signed URL is created from
  // Supabase Storage. This service-role call is scoped to a single-file
  // signed URL, bound to a path the RPC already validated as safe to expose.
  const service = createServiceRoleClient();
  const { data: signed, error: signErr } = await service.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, PLAYBACK_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) return null;

  return {
    signedUrl: signed.signedUrl,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
  };
}