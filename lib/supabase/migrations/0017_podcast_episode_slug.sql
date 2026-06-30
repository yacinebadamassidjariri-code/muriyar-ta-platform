-- =====================================================================
-- Migration 0017 — Podcast episode slug (CMS Phase F1.1)
-- Additive only. Adds a `slug` column to podcast_episodes, a partial UNIQUE
-- index, a format CHECK, and re-creates podcast_episodes_public to expose
-- `slug` to the public site. Existing rows keep slug=NULL until editors set
-- one via the CMS (no automated backfill).
--
-- Conventions:
--   • Idempotent (ADD COLUMN IF NOT EXISTS; CREATE … IF NOT EXISTS; named
--     constraint creation guarded via pg_constraint).
--   • No RLS changes (existing policies cover the new column).
--   • Existing aud_podcast trigger (0005) audits the new column automatically.
--   • Public view stays security_invoker = on, status='published' filter,
--     and continues to omit `participants` and `is_featured`.
--   • Re-uses the existing public.slugify(text) helper from migration 0015
--     (no new function defined here).
-- Compatibility: depends on 0001–0016. Transaction-wrapped (no CONCURRENTLY).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Additive column. Nullable to allow legacy rows; CMS sets it per row.
-- ---------------------------------------------------------------------
alter table public.podcast_episodes
  add column if not exists slug text;


-- ---------------------------------------------------------------------
-- 2) Format CHECK. Conservative slug grammar (1–80 chars, [a-z0-9-]).
--    Matches the Stories slug rules; reuses public.slugify() outputs.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pod_slug_format_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_slug_format_chk
      check (
        slug is null
        or (slug ~ '^[a-z0-9-]+$' and char_length(slug) between 1 and 80)
      );
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 3) Partial UNIQUE index. Permits multiple NULLs (legacy rows) while
--    guaranteeing global uniqueness once a slug is set. This is the
--    constraint that backstops slug_taken in the CMS RPC (Phase F1.2).
-- ---------------------------------------------------------------------
create unique index if not exists pod_slug_unique_idx
  on public.podcast_episodes (slug)
  where slug is not null;


-- ---------------------------------------------------------------------
-- 4) Re-create podcast_episodes_public to expose `slug` to the public site.
--    security_invoker stays ON; status='published' filter preserved;
--    `participants` and `is_featured` remain hidden by view construction.
-- ---------------------------------------------------------------------
drop view if exists public.podcast_episodes_public;

create view public.podcast_episodes_public
  with (security_invoker = on) as
select
  episode_id,
  slug,
  episode_number,
  title,
  description,
  audio_asset_id,
  external_audio_url,
  duration_seconds,
  transcript,
  cover_art_asset_id,
  language_code,
  streaming_links,
  published_at,
  series_slug,
  episode_kind,
  content_advisory,
  transcript_status,
  episode_summary,
  chapters
from public.podcast_episodes
where status = 'published';

grant select on public.podcast_episodes_public to anon, authenticated;


-- =====================================================================
-- End of 0017 — verification queries and rollback plan are in the spec.
-- =====================================================================
