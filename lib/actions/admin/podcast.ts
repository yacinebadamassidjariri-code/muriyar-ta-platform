import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin data layer for the Podcast CMS.
 *
 * Reads from base `podcast_episodes` (staff-only via RLS) so the dashboard
 * can show drafts, archived rows, and editorial fields. Page guards are
 * responsible for permission (`podcast.edit`); this module is "safe by RLS"
 * but "intended for staff" — same convention as the moderation read layer.
 *
 * No writes here. Writes go through the SECURITY DEFINER RPCs in 0018.
 *
 * Error model: every function returns a discriminated `{ ok: true, ... }`
 * or `{ ok: false, error }` so the dashboard can distinguish a legitimate
 * empty result (ok=true, items=[]) from a database failure.
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
  created_by: string | null;
  created_by_display: string | null;
  published_by_display: string | null;
  updated_at: string;
};

export type Language = {
  language_code: string;
  display_name: string;
  is_active: boolean;
};

// Discriminated results — the dashboard distinguishes real errors from empty.
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// PostgREST embed via column disambiguation (!created_by / !published_by).
// This is robust to FK constraint-name variations across environments.
// Phase F1.4 note: if your project ever needs to lock to constraint names,
// substitute `!<constraint_name>` (typically `podcast_episodes_created_by_fkey`
// and `podcast_episodes_published_by_fkey` per the project's naming convention).
const LIST_COLS =
  "episode_id, slug, title, status, language_code, series_slug, is_featured, " +
  "duration_seconds, published_at, updated_at, created_by, " +
  "created_by_user:users!created_by(display_name)";

const DETAIL_COLS =
  "episode_id, slug, title, description, episode_summary, series_slug, " +
  "episode_kind, language_code, content_advisory, transcript_status, " +
  "is_featured, duration_seconds, status, published_at, published_by, " +
  "created_by, updated_at, " +
  "created_by_user:users!created_by(display_name), " +
  "published_by_user:users!published_by(display_name)";

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

  type Row = Omit<EpisodeListRow, "created_by_display"> & {
    created_by_user: EmbeddedUser | EmbeddedUser[];
  };

  const items: EpisodeListRow[] = ((data ?? []) as Row[]).map((r) => ({
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
    created_by_display: flattenEmbeddedDisplay(r.created_by_user),
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

  type Row = Omit
    EpisodeForEdit,
    "created_by_display" | "published_by_display"
  > & {
    created_by_user: EmbeddedUser | EmbeddedUser[];
    published_by_user: EmbeddedUser | EmbeddedUser[];
  };
  const r = data as Row;

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
      created_by_display: flattenEmbeddedDisplay(r.created_by_user),
      published_by_display: flattenEmbeddedDisplay(r.published_by_user),
      updated_at: r.updated_at,
    },
  };
}

// ---------------------------------------------------------------------------
// listLanguages
// ---------------------------------------------------------------------------

export async function listLanguages(): Promise<Result<Language[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supported_languages")
    .select("language_code, display_name, is_active")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, value: (data ?? []) as Language[] };
}