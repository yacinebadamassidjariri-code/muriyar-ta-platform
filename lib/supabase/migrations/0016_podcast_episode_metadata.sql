-- =====================================================================
-- Migration 0016 — Podcast episode metadata (Phase A)
-- Additive only. Adds the columns the Phase A episode page needs and
-- extends podcast_episodes_public to surface the public-safe subset.
--
-- Conventions:
--   • Idempotent (CREATE TYPE / ADD COLUMN / CREATE INDEX guards).
--   • No RLS changes (existing policies cover the new columns).
--   • Existing aud_podcast trigger (0005) audits these columns automatically.
--   • `participants` and `is_featured` stay on the base table only; they are
--     NOT exposed by the public view (editorial / staff-only signals).
--   • No podcast_series table — series live in code config.
-- Compatibility: depends on 0001–0015. Transaction-wrapped (no CONCURRENTLY).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Three small enums (Postgres has no CREATE TYPE IF NOT EXISTS).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'podcast_episode_kind') then
    create type public.podcast_episode_kind as enum
      ('story', 'discussion', 'taboo_topic', 'roundtable');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'podcast_content_advisory') then
    create type public.podcast_content_advisory as enum ('none', 'mild', 'strong');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'podcast_transcript_status') then
    create type public.podcast_transcript_status as enum ('none', 'auto', 'human_reviewed');
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2) Additive columns on podcast_episodes.
--    All nullable or defaulted; safe on existing rows.
-- ---------------------------------------------------------------------
alter table public.podcast_episodes
  add column if not exists series_slug      text,
  add column if not exists episode_kind     public.podcast_episode_kind,
  add column if not exists content_advisory public.podcast_content_advisory not null default 'none',
  add column if not exists transcript_status public.podcast_transcript_status not null default 'none',
  add column if not exists episode_summary  text,
  add column if not exists chapters         jsonb,
  add column if not exists participants     jsonb,
  add column if not exists is_featured      boolean not null default false;


-- ---------------------------------------------------------------------
-- 3) Defensive constraints (named so they can be dropped cleanly).
--    The "real" validation that series_slug matches a known series lives
--    in the application — series are code config, not a DB table.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pod_series_slug_len_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_series_slug_len_chk
      check (series_slug is null or char_length(series_slug) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pod_chapters_array_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_chapters_array_chk
      check (chapters is null or jsonb_typeof(chapters) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pod_participants_array_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_participants_array_chk
      check (participants is null or jsonb_typeof(participants) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pod_episode_summary_len_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_episode_summary_len_chk
      check (episode_summary is null or char_length(episode_summary) <= 8000);
  end if;

  -- Only published episodes can be featured. UI also enforces this; DB is the backstop.
  if not exists (
    select 1 from pg_constraint where conname = 'pod_featured_requires_published_chk'
  ) then
    alter table public.podcast_episodes
      add constraint pod_featured_requires_published_chk
      check (is_featured = false or status = 'published');
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 4) Indexes for the new lookup paths (partial — only the values we filter on).
-- ---------------------------------------------------------------------
create index if not exists pod_series_slug_idx
  on public.podcast_episodes (series_slug)
  where series_slug is not null;

create index if not exists pod_featured_idx
  on public.podcast_episodes (is_featured)
  where is_featured = true;

create index if not exists pod_kind_idx
  on public.podcast_episodes (episode_kind)
  where episode_kind is not null;


-- ---------------------------------------------------------------------
-- 5) Re-create podcast_episodes_public to surface the public-safe subset.
--    security_invoker = on (RLS still applies to the querying role).
--    Filters status='published'. Excludes `participants` and `is_featured`
--    deliberately — those are staff-only editorial signals.
-- ---------------------------------------------------------------------
drop view if exists public.podcast_episodes_public;

create view public.podcast_episodes_public
  with (security_invoker = on) as
select
  episode_id,
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
  -- Phase A additions (public-safe):
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
-- End of 0016 — verification queries are in the migration spec, not the SQL.
-- =====================================================================
