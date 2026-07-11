import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin data layer for the Podcast CMS.
 *
 * Reads from base `podcast_episodes` (staff-only via RLS) so the dashboard
 * and editor can show drafts, archived rows, and editorial fields like
 * `is_featured`, `participants`, `created_by`, and `published_by`. Page
 * guards are responsible for permission (`podcast.edit`); this module is
 * "safe by RLS" but "intended for staff" — same convention as the
 * moderation read layer.
 *
 * No writes here. Writes go through the SECURITY DEFINER RPCs in 0018.
 *
 * Error model: every function returns a discriminated
 *   { ok: true, value: T } | { ok: false, error: string }
 * so callers can distinguish a legitimate empty result (ok=true, items=[])
 * from a database failure.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EpisodeStatus = "draft" | "published" | "archived";

export type SortKey =
  | "newest"
  | "oldest"
  | "title_asc"
  | "title_desc"
  | "updated_desc"
  | "updated_asc";

export type ListEpisodesOptions = {
  q?: string | null;
  status?: EpisodeStatus | null;
  languageCode?: string | null;
  seriesSlug?: string | null;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

export type EpisodeListRow = {
  episode_id: string;
  slug: string | null;
  title: string;
  status: EpisodeStatus;
  language_code: string;
  series_slug: string | null;
  is_featured: boolean;
  duration_seconds: number | null;
  published_at: string | null;
  updated_at: string;
  created_by: string | null;
  created_by_display: string | null;
};

export type EpisodeListResult = {
  items: EpisodeListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type EpisodeForEdit = {
  episode_id: string;
  slug: string | null;
  title: string;
  description: string | null;
  episode_summary: string | null;
  series_slug: string | null;
  episode_kind:
    | "story"
    | "discussion"
    | "taboo_topic"
    | "roundtable"
    | null;
  language_code: string;
  content_advisory: "none" | "mild" | "strong";
  transcript_status: "none" | "auto" | "human_reviewed";
  is_featured: boolean;
  duration_seconds: number | null;
  status: EpisodeStatus;
  published_at: string | null;
  published_by: string | null;
  audio_asset_id: string | null;
  artwork_asset_id: string | null;
  created_by: string | null;
  created_by_display: string | null;
  published_by_display: string | null;
  updated_at: string;
  audio_original_filename: string | null;
  audio_mime_type: string | null;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  audio_uploaded_at: string | null;
  artwork_original_filename: string | null;
  artwork_mime_type: string | null;
  artwork_size_bytes: number | null;
  artwork_uploaded_at: string | null;
};

export type Language = {
  language_code: string;
  display_name: string;
  is_active: boolean;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// PostgREST embed via column disambiguation (!created_by / !published_by).
// Robust to FK constraint-name variations across environments. If your
// project ever needs to lock to constraint names, substitute
// `!podcast_episodes_created_by_fkey` / `!podcast_episodes_published_by_fkey`.

const LIST_COLS =
  "episode_id, slug, title, status, language_code, series_slug, is_featured, " +
  "duration_seconds, published_at, updated_at";
  
const DETAIL_COLS =
  "episode_id, slug, title, description, episode_summary, series_slug, " +
  "episode_kind, language_code, content_advisory, transcript_status, " +
  "is_featured, duration_seconds, status, published_at, published_by, " +
  "audio_asset_id, artwork_asset_id, created_by, updated_at, " +
  "audio_asset:podcast_media_assets!audio_asset_id(original_filename, mime_type, size_bytes, duration_seconds, uploaded_at, status), " +
  "artwork_asset:podcast_media_assets!artwork_asset_id(original_filename, mime_type, size_bytes, uploaded_at, status)";

/** Neutralize PostgREST ilike wildcards in user input. */
function escapeIlike(term: string): string {
  return term.replace(/[\\%_]/g, (m) => "\\" + m);
}

function clampPageSize(n: number | undefined): number {
  const v = Math.floor(n ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(v) || v < 1) return DEFAULT_PAGE_SIZE;
  if (v > MAX_PAGE_SIZE) return MAX_PAGE_SIZE;
  return v;
}

function clampPage(n: number | undefined): number {
  const v = Math.floor(n ?? 1);
  return Number.isFinite(v) && v >= 1 ? v : 1;
}

type EmbeddedUser = { display_name: string | null } | null;

function flattenEmbeddedDisplay(
  embedded: EmbeddedUser | EmbeddedUser[] | undefined,
): string | null {
  if (!embedded) return null;
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  return row?.display_name ?? null;
}

// ---------------------------------------------------------------------------
// listAllEpisodes
// ---------------------------------------------------------------------------

export async function listAllEpisodes(
  opts: ListEpisodesOptions = {},
): Promise<Result<EpisodeListResult>> {
  const page = clampPage(opts.page);
  const pageSize = clampPageSize(opts.pageSize);
  const sort: SortKey = opts.sort ?? "newest";

  const supabase = await createClient();
  let query = supabase
    .from("podcast_episodes")
    .select(LIST_COLS, { count: "exact" });

  // Filters
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.languageCode) query = query.eq("language_code", opts.languageCode);
  if (opts.seriesSlug) query = query.eq("series_slug", opts.seriesSlug);

  const q = opts.q?.trim();
  if (q) {
    const term = escapeIlike(q);
    query = query.or(
      [
        `title.ilike.%${term}%`,
        `slug.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `episode_summary.ilike.%${term}%`,
      ].join(","),
    );
  }

  // Sorting (each branch ends with a stable tiebreaker on episode_id).
  switch (sort) {
    case "oldest":
      query = query
        .order("published_at", { ascending: true, nullsFirst: true })
        .order("updated_at", { ascending: true })
        .order("episode_id", { ascending: true });
      break;
    case "title_asc":
      query = query
        .order("title", { ascending: true })
        .order("episode_id", { ascending: true });
      break;
    case "title_desc":
      query = query
        .order("title", { ascending: false })
        .order("episode_id", { ascending: true });
      break;
    case "updated_asc":
      query = query
        .order("updated_at", { ascending: true })
        .order("episode_id", { ascending: true });
      break;
    case "updated_desc":
      query = query
        .order("updated_at", { ascending: false })
        .order("episode_id", { ascending: true });
      break;
    case "newest":
    default:
      query = query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .order("episode_id", { ascending: true });
      break;
  }

  // Pagination (offset-based; PostgREST .range is inclusive on both ends).
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    return { ok: false, error: error.message };
  }

  type Row = EpisodeListRow;

  const items: EpisodeListRow[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    episode_id: r.episode_id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    language_code: r.language_code,
    series_slug: r.series_slug,
    is_featured: r.is_featured,
    duration_seconds: r.duration_seconds,
    published_at: r.published_at,
    updated_at: r.updated_at,
    created_by: r.created_by,
    created_by_display: null,
  }));

  const total = count ?? items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    ok: true,
    value: { items, total, page, pageSize, pageCount },
  };
}

// ---------------------------------------------------------------------------
// getEpisodeForEdit
// ---------------------------------------------------------------------------

export async function getEpisodeForEdit(
  episodeId: string,
): Promise<Result<EpisodeForEdit | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select(DETAIL_COLS)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: true, value: null };
  }

 type MediaAsset = {
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds?: number | null;
  uploaded_at: string | null;
  status: string;
};

type Row = Omit<
  EpisodeForEdit,
  | "created_by_display"
  | "published_by_display"
  | "audio_original_filename"
  | "audio_mime_type"
  | "audio_size_bytes"
  | "audio_duration_seconds"
  | "audio_uploaded_at"
  | "artwork_original_filename"
  | "artwork_mime_type"
  | "artwork_size_bytes"
  | "artwork_uploaded_at"
> & {
  created_by_user: EmbeddedUser | EmbeddedUser[];
  published_by_user: EmbeddedUser | EmbeddedUser[];
  audio_asset:
    | {
        original_filename: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        duration_seconds: number | null;
        uploaded_at: string | null;
        status: string;
      }
    | Array<{
        original_filename: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        duration_seconds: number | null;
        uploaded_at: string | null;
        status: string;
      }>
    | null;
  artwork_asset:
    | {
        original_filename: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_at: string | null;
        status: string;
      }
    | Array<{
        original_filename: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_at: string | null;
        status: string;
      }>
    | null;
};
  const r = data as unknown as Row;

  const audioRow = Array.isArray(r.audio_asset)
  ? r.audio_asset[0]
  : r.audio_asset;

  const artRow = Array.isArray(r.artwork_asset)
    ? r.artwork_asset[0]
    : r.artwork_asset;

  const audioReady =
    audioRow && audioRow.status === "ready"
      ? audioRow
      : null;

  const artworkReady =
    artRow && artRow.status === "ready"
      ? artRow
      : null;

  return {
    ok: true,
    value: {
      episode_id: r.episode_id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      episode_summary: r.episode_summary,
      series_slug: r.series_slug,
      episode_kind: r.episode_kind,
      language_code: r.language_code,
      content_advisory: r.content_advisory,
      transcript_status: r.transcript_status,
      is_featured: r.is_featured,
      duration_seconds: r.duration_seconds,
      status: r.status,
      published_at: r.published_at,
      published_by: r.published_by,
      created_by: r.created_by,
      created_by_display: null,
      published_by_display: flattenEmbeddedDisplay(r.published_by_user),
      updated_at: r.updated_at,
      audio_asset_id: r.audio_asset_id,
      artwork_asset_id: r.artwork_asset_id,

      audio_original_filename: audioReady?.original_filename ?? null,
audio_mime_type: audioReady?.mime_type ?? null,
audio_size_bytes: audioReady?.size_bytes ?? null,
audio_duration_seconds: audioReady?.duration_seconds ?? null,
audio_uploaded_at: audioReady?.uploaded_at ?? null,

artwork_original_filename: artworkReady?.original_filename ?? null,
artwork_mime_type: artworkReady?.mime_type ?? null,
artwork_size_bytes: artworkReady?.size_bytes ?? null,
artwork_uploaded_at: artworkReady?.uploaded_at ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// listLanguages
// ---------------------------------------------------------------------------

export async function listLanguages(): Promise<Result<Language[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("supported_languages")
      .select("language_code, display_name:name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    console.log("LANGUAGE QUERY ERROR:", error);
    console.log("LANGUAGE QUERY DATA:", data);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, value: (data ?? []) as Language[] };
  } catch (e) {
    console.error("listLanguages crashed:", e);
    return { ok: false, error: "crashed" };
  }
}