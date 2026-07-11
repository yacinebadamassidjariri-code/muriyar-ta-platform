-- =====================================================================
-- Migration 0020 — Phase 2A M2: Podcast media asset schema
--
-- Additive only. Depends on 0019 (buckets + kind/status enums).
--
-- Introduces:
--   • enum podcast_media_origin ('upload' | 'replacement' | 'ai_narration')
--   • table podcast_media_assets (unified audio + artwork; lifecycle rows)
--   • FK on existing podcast_episodes.audio_asset_id → podcast_media_assets
--   • new column podcast_episodes.artwork_asset_id → podcast_media_assets
--   • trigger enforcing referenced-asset kind matches the pointer column
--   • updated_at + audit triggers on podcast_media_assets
--   • RLS + staff-only policies on podcast_media_assets
--   • re-creates podcast_episodes_public to expose ready audio + artwork
--     paths (published episodes only), leaving all prior columns intact
--
-- Does NOT (deliberately):
--   • create RPCs (M3)
--   • add transcript_asset_id or downloadable to podcast_episodes
--   • add analytics tables or chapters (Phase 3 / later)
--   • add waveform_json (Phase 3)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Origin enum (upload | replacement | ai_narration).
--    Kept out of 0019 because 0019 had no column consuming it.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'podcast_media_origin') then
    create type public.podcast_media_origin as enum (
      'upload',
      'replacement',
      'ai_narration'
    );
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 2) podcast_media_assets — the unified lifecycle table.
--    kind + status + origin from 0019/this migration.
--    Every asset belongs to exactly one episode; episode delete cascades.
-- ---------------------------------------------------------------------
create table if not exists public.podcast_media_assets (
  asset_id           uuid primary key default gen_random_uuid(),
  episode_id         uuid not null references public.podcast_episodes(episode_id) on delete cascade,
  kind               public.podcast_media_kind not null,
  status             public.podcast_media_asset_status not null default 'uploading',
  origin             public.podcast_media_origin not null default 'upload',
  storage_bucket     text not null,
  storage_path       text not null,
  original_filename  text,
  mime_type          text not null,
  size_bytes         bigint not null check (size_bytes > 0),
  duration_seconds   int,
  sha256             text,
  uploaded_by        uuid not null references public.users(user_id),
  uploaded_at        timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint pma_kind_bucket_chk check (
    (kind = 'audio'   and storage_bucket = 'podcast-audio')
    or
    (kind = 'artwork' and storage_bucket = 'podcast-artwork')
  )
);

-- Indexes.
create index if not exists podcast_media_assets_episode_kind_idx
  on public.podcast_media_assets (episode_id, kind);

create index if not exists podcast_media_assets_status_idx
  on public.podcast_media_assets (status);

create index if not exists podcast_media_assets_uploaded_by_idx
  on public.podcast_media_assets (uploaded_by);


-- ---------------------------------------------------------------------
-- 3) FK the existing podcast_episodes.audio_asset_id column (added in
--    0016 as an unattached uuid) to podcast_media_assets. ON DELETE SET
--    NULL keeps the episode row healthy across asset soft-delete.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'podcast_episodes_audio_asset_id_fkey'
  ) then
    alter table public.podcast_episodes
      add constraint podcast_episodes_audio_asset_id_fkey
      foreign key (audio_asset_id)
      references public.podcast_media_assets(asset_id)
      on delete set null;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 4) Add podcast_episodes.artwork_asset_id (new column + FK).
-- ---------------------------------------------------------------------
alter table public.podcast_episodes
  add column if not exists artwork_asset_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'podcast_episodes_artwork_asset_id_fkey'
  ) then
    alter table public.podcast_episodes
      add constraint podcast_episodes_artwork_asset_id_fkey
      foreign key (artwork_asset_id)
      references public.podcast_media_assets(asset_id)
      on delete set null;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 5) Enforce that each pointer references an asset of the right kind.
--    Trigger runs BEFORE INSERT OR UPDATE of the two pointer columns
--    and raises wrong_asset_kind on mismatch.
-- ---------------------------------------------------------------------
create or replace function public.podcast_episode_asset_kind_check()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_audio_kind   public.podcast_media_kind;
  v_artwork_kind public.podcast_media_kind;
begin
  if new.audio_asset_id is not null then
    select kind into v_audio_kind
    from public.podcast_media_assets
    where asset_id = new.audio_asset_id;
    if v_audio_kind is null or v_audio_kind <> 'audio' then
      raise exception 'wrong_asset_kind' using errcode = '23514';
    end if;
  end if;

  if new.artwork_asset_id is not null then
    select kind into v_artwork_kind
    from public.podcast_media_assets
    where asset_id = new.artwork_asset_id;
    if v_artwork_kind is null or v_artwork_kind <> 'artwork' then
      raise exception 'wrong_asset_kind' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists podcast_episode_asset_kind_check_trg on public.podcast_episodes;
create trigger podcast_episode_asset_kind_check_trg
  before insert or update of audio_asset_id, artwork_asset_id
  on public.podcast_episodes
  for each row
  execute function public.podcast_episode_asset_kind_check();


-- ---------------------------------------------------------------------
-- 6) updated_at trigger (reuses existing helper set_updated_at()).
-- ---------------------------------------------------------------------
drop trigger if exists set_updated_at_podcast_media_assets on public.podcast_media_assets;
create trigger set_updated_at_podcast_media_assets
  before update on public.podcast_media_assets
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 7) Audit trigger. Mirrors aud_podcast — scrubs payloads via
--    audit.scrub() and writes to audit.audit_log.
-- ---------------------------------------------------------------------
create or replace function public.aud_podcast_media_assets_fn()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_row_pk uuid;
begin
  v_row_pk := coalesce(new.asset_id, old.asset_id);

  insert into audit.audit_log (op, table_name, row_pk, actor, payload)
  values (
    tg_op,
    'podcast_media_assets',
    v_row_pk,
    auth.uid(),
    audit.scrub(
      case tg_op
        when 'DELETE' then to_jsonb(old)
        else               to_jsonb(new)
      end
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists aud_podcast_media_assets on public.podcast_media_assets;
create trigger aud_podcast_media_assets
  after insert or update or delete on public.podcast_media_assets
  for each row execute function public.aud_podcast_media_assets_fn();


-- ---------------------------------------------------------------------
-- 8) RLS + staff-only policies on podcast_media_assets.
--    Public reads go through podcast_episodes_public (re-created below),
--    so no anon policy on this base table.
-- ---------------------------------------------------------------------
alter table public.podcast_media_assets enable row level security;

drop policy if exists "pma_staff_select" on public.podcast_media_assets;
drop policy if exists "pma_staff_insert" on public.podcast_media_assets;
drop policy if exists "pma_staff_update" on public.podcast_media_assets;
drop policy if exists "pma_staff_delete" on public.podcast_media_assets;

create policy "pma_staff_select"
  on public.podcast_media_assets for select
  to authenticated
  using (public.has_permission('podcast.edit'));

create policy "pma_staff_insert"
  on public.podcast_media_assets for insert
  to authenticated
  with check (public.has_permission('podcast.edit'));

create policy "pma_staff_update"
  on public.podcast_media_assets for update
  to authenticated
  using (public.has_permission('podcast.edit'))
  with check (public.has_permission('podcast.edit'));

create policy "pma_staff_delete"
  on public.podcast_media_assets for delete
  to authenticated
  using (public.has_permission('podcast.edit'));


-- ---------------------------------------------------------------------
-- 9) Re-create podcast_episodes_public to expose ready audio + artwork
--    paths via LEFT JOINs. Preserves every existing column; adds the
--    new *_public projection columns. security_invoker + status filter
--    preserved; anon SELECT preserved. participants and is_featured
--    remain hidden.
-- ---------------------------------------------------------------------
drop view if exists public.podcast_episodes_public;

create view public.podcast_episodes_public
  with (security_invoker = on) as
select
  e.episode_id,
  e.slug,
  e.episode_number,
  e.title,
  e.description,
  e.audio_asset_id,
  e.external_audio_url,
  e.duration_seconds,
  e.transcript,
  e.cover_art_asset_id,
  e.language_code,
  e.streaming_links,
  e.published_at,
  e.series_slug,
  e.episode_kind,
  e.content_advisory,
  e.transcript_status,
  e.episode_summary,
  e.chapters,
  e.artwork_asset_id,
  -- Ready audio projection (NULL if no ready audio asset for the episode)
  a.asset_id         as audio_asset_id_public,
  a.storage_bucket   as audio_storage_bucket_public,
  a.storage_path     as audio_storage_path_public,
  a.mime_type        as audio_mime_type_public,
  a.size_bytes       as audio_size_bytes_public,
  a.duration_seconds as audio_duration_seconds_public,
  -- Ready artwork projection (NULL if no ready artwork asset)
  w.asset_id         as artwork_asset_id_public,
  w.storage_bucket   as artwork_storage_bucket_public,
  w.storage_path     as artwork_storage_path_public,
  w.mime_type        as artwork_mime_type_public,
  w.size_bytes       as artwork_size_bytes_public
from public.podcast_episodes e
left join public.podcast_media_assets a
  on a.asset_id = e.audio_asset_id and a.status = 'ready' and a.kind = 'audio'
left join public.podcast_media_assets w
  on w.asset_id = e.artwork_asset_id and w.status = 'ready' and w.kind = 'artwork'
where e.status = 'published';

grant select on public.podcast_episodes_public to anon, authenticated;


-- =====================================================================
-- End of 0020 — verification queries, expected results, and rollback
-- plan are documented in the accompanying M2 message.
-- =====================================================================
