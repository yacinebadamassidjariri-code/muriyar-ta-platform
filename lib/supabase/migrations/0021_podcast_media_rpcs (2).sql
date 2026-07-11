-- =====================================================================
-- Migration 0021 — Phase 2A M3: Podcast media lifecycle RPCs
--
-- Additive only. Introduces four SECURITY DEFINER RPCs:
--   • request_podcast_media_upload   — create an 'uploading' asset row
--   • finalize_podcast_media_upload  — flip 'uploading' → 'ready' and
--                                       point the episode at it
--   • delete_podcast_media           — soft-delete + unset pointer
--   • get_podcast_media_playback_url — DB-side visibility gate for public
--
-- IMPORTANT — no custom enum types are referenced anywhere in this file.
-- All internal variables are `text`. Values only meet their column types
-- at the INSERT/UPDATE boundary, where Postgres casts implicitly. This
-- migration compiles regardless of whether podcast_media_kind,
-- podcast_media_asset_status, or podcast_media_origin exist as enum
-- types or as varchar/text columns in the underlying schema.
--
-- Signed URL creation belongs to the M4 server action layer — the URL
-- API isn't callable from plpgsql. These RPCs return storage coordinates
-- (bucket + path); the server helper asks Storage for the signed URL.
--
-- All new podcast-specific errors are namespaced with a `podcast_` prefix
-- for consistency with 0018.
--
-- No analytics. No transcript. No waveform. No downloads.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Internal helper: resolve bucket from kind. Kept private (`_pod_*`).
-- ---------------------------------------------------------------------
create or replace function public._pod_bucket_for_kind(p_kind text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_kind
    when 'audio'   then 'podcast-audio'
    when 'artwork' then 'podcast-artwork'
  end;
$$;

revoke all on function public._pod_bucket_for_kind(text) from public;


-- ---------------------------------------------------------------------
-- Internal helper: resolve file extension from mime type.
-- Returns null when unknown, which the caller treats as invalid_mime.
-- ---------------------------------------------------------------------
create or replace function public._pod_ext_for_mime(p_mime text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_mime
    when 'audio/mpeg'  then 'mp3'
    when 'audio/mp4'   then 'm4a'
    when 'audio/aac'   then 'aac'
    when 'audio/wav'   then 'wav'
    when 'audio/x-wav' then 'wav'
    when 'image/jpeg'  then 'jpg'
    when 'image/png'   then 'png'
    when 'image/webp'  then 'webp'
    else null
  end;
$$;

revoke all on function public._pod_ext_for_mime(text) from public;


-- ---------------------------------------------------------------------
-- 1) request_podcast_media_upload
--
--    All local variables are text. Kind, origin, and status meet the
--    columns' actual types at the INSERT boundary (Postgres casts).
-- ---------------------------------------------------------------------
create or replace function public.request_podcast_media_upload(
  p_episode_id        uuid,
  p_kind              text,
  p_mime_type         text,
  p_size_bytes        bigint,
  p_original_filename text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket          text;
  v_ext             text;
  v_asset_id        uuid := gen_random_uuid();
  v_storage_path    text;
  v_episode_status  text;
  v_has_prior_ready boolean;
  v_origin          text;
begin
  -- Permission gate.
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Kind validity.
  if p_kind not in ('audio', 'artwork') then
    raise exception 'podcast_invalid_kind' using errcode = '22023';
  end if;
  v_bucket := public._pod_bucket_for_kind(p_kind);

  -- Episode must exist and not be archived. Lock for the pointer read
  -- so a concurrent metadata save can't race the origin check.
  select status::text into v_episode_status
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_episode_status = 'archived' then
    raise exception 'podcast_not_editable' using errcode = '22023';
  end if;

  -- Mime allow-list (kind-scoped).
  if p_kind = 'audio' then
    if p_mime_type not in ('audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav') then
      raise exception 'podcast_invalid_mime' using errcode = '22023';
    end if;
    if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 262144000 then
      raise exception 'podcast_invalid_size' using errcode = '22001';
    end if;
  else
    if p_mime_type not in ('image/jpeg','image/png','image/webp') then
      raise exception 'podcast_invalid_mime' using errcode = '22023';
    end if;
    if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760 then
      raise exception 'podcast_invalid_size' using errcode = '22001';
    end if;
  end if;

  v_ext := public._pod_ext_for_mime(p_mime_type);
  if v_ext is null then
    -- Unreachable given the allow-list above, but keeps the invariant.
    raise exception 'podcast_invalid_mime' using errcode = '22023';
  end if;

  v_storage_path := p_episode_id::text || '/' || v_asset_id::text || '.' || v_ext;

  -- Was there a prior non-deleted asset of this kind on the episode?
  -- Compare kind and status via ::text so this works with either enum or
  -- text/varchar columns.
  select exists (
    select 1 from public.podcast_media_assets
    where episode_id = p_episode_id
      and kind::text = p_kind
      and status::text in ('uploading','ready','replaced')
  ) into v_has_prior_ready;

  v_origin := case when v_has_prior_ready then 'replacement' else 'upload' end;

  -- INSERT. Text values cast to the columns' actual types automatically.
  insert into public.podcast_media_assets (
    asset_id, episode_id, kind, status, origin,
    storage_bucket, storage_path,
    original_filename, mime_type, size_bytes,
    uploaded_by
  ) values (
    v_asset_id, p_episode_id, p_kind, 'uploading', v_origin,
    v_bucket, v_storage_path,
    nullif(btrim(p_original_filename), ''),
    p_mime_type, p_size_bytes,
    auth.uid()
  );

  return jsonb_build_object(
    'asset_id',       v_asset_id,
    'storage_bucket', v_bucket,
    'storage_path',   v_storage_path,
    'kind',           p_kind
  );
end;
$$;

revoke all on function public.request_podcast_media_upload(uuid, text, text, bigint, text) from public;
grant execute on function public.request_podcast_media_upload(uuid, text, text, bigint, text) to authenticated;


-- ---------------------------------------------------------------------
-- 2) finalize_podcast_media_upload
--
--    Loads the asset row using a discrete SELECT list (no %rowtype)
--    so the local variables can stay text.
-- ---------------------------------------------------------------------
create or replace function public.finalize_podcast_media_upload(
  p_asset_id         uuid,
  p_duration_seconds int  default null,
  p_sha256           text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode_id       uuid;
  v_kind             text;
  v_status           text;
  v_storage_bucket   text;
  v_storage_path     text;
  v_mime_type        text;
  v_size_bytes       bigint;
  v_duration_seconds int;
  v_sha256           text;
  v_prior_asset_id   uuid;
begin
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Lock and load the asset with an explicit column list; all "typed"
  -- columns are read via ::text so this stays enum-agnostic.
  select episode_id,
         kind::text,
         status::text,
         storage_bucket,
         storage_path,
         mime_type,
         size_bytes,
         duration_seconds,
         sha256
    into v_episode_id,
         v_kind,
         v_status,
         v_storage_bucket,
         v_storage_path,
         v_mime_type,
         v_size_bytes,
         v_duration_seconds,
         v_sha256
  from public.podcast_media_assets
  where asset_id = p_asset_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_status <> 'uploading' then
    raise exception 'podcast_asset_not_uploading' using errcode = '22023';
  end if;

  -- Duration bounds — audio only.
  if v_kind = 'audio' and p_duration_seconds is not null then
    if p_duration_seconds <= 0 or p_duration_seconds > 86400 then
      raise exception 'podcast_invalid_duration' using errcode = '22001';
    end if;
  end if;

  -- Lock the episode row before touching pointers.
  perform 1 from public.podcast_episodes
  where episode_id = v_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Fetch the currently-pointed prior asset (if any) of the same kind.
  if v_kind = 'audio' then
    select audio_asset_id into v_prior_asset_id
    from public.podcast_episodes where episode_id = v_episode_id;
  else
    select artwork_asset_id into v_prior_asset_id
    from public.podcast_episodes where episode_id = v_episode_id;
  end if;

  -- If the pointer already targets a different ready asset, mark the old
  -- one as 'replaced'. If pointer targeted this same asset for some
  -- reason (shouldn't happen mid-uploading), leave it alone.
  if v_prior_asset_id is not null and v_prior_asset_id <> p_asset_id then
    update public.podcast_media_assets
    set status = 'replaced',
        origin = 'replacement'
    where asset_id = v_prior_asset_id
      and status::text = 'ready';
  end if;

  -- Finalize this asset.
  update public.podcast_media_assets
  set status           = 'ready',
      duration_seconds = case when v_kind = 'audio'
                              then coalesce(p_duration_seconds, v_duration_seconds)
                              else null end,
      sha256           = coalesce(p_sha256, v_sha256)
  where asset_id = p_asset_id;

  -- Point the episode at this asset. The M2 kind-check trigger enforces
  -- that the referenced asset's kind matches the column.
  if v_kind = 'audio' then
    update public.podcast_episodes
    set audio_asset_id = p_asset_id
    where episode_id = v_episode_id;
  else
    update public.podcast_episodes
    set artwork_asset_id = p_asset_id
    where episode_id = v_episode_id;
  end if;

  -- Re-read the durable fields for the return payload.
  select duration_seconds
    into v_duration_seconds
  from public.podcast_media_assets
  where asset_id = p_asset_id;

  return jsonb_build_object(
    'asset_id',         p_asset_id,
    'kind',             v_kind,
    'status',           'ready',
    'storage_bucket',   v_storage_bucket,
    'storage_path',     v_storage_path,
    'mime_type',        v_mime_type,
    'size_bytes',       v_size_bytes,
    'duration_seconds', v_duration_seconds
  );
end;
$$;

revoke all on function public.finalize_podcast_media_upload(uuid, int, text) from public;
grant execute on function public.finalize_podcast_media_upload(uuid, int, text) to authenticated;


-- ---------------------------------------------------------------------
-- 3) delete_podcast_media
-- ---------------------------------------------------------------------
create or replace function public.delete_podcast_media(
  p_episode_id uuid,
  p_kind       text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ptr_id       uuid;
  v_asset_status text;
begin
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_kind not in ('audio', 'artwork') then
    raise exception 'podcast_invalid_kind' using errcode = '22023';
  end if;

  -- Lock the episode row.
  perform 1 from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if p_kind = 'audio' then
    select audio_asset_id into v_ptr_id
    from public.podcast_episodes where episode_id = p_episode_id;
  else
    select artwork_asset_id into v_ptr_id
    from public.podcast_episodes where episode_id = p_episode_id;
  end if;

  -- No-op if no pointer set (idempotent).
  if v_ptr_id is null then
    return jsonb_build_object(
      'asset_id', null,
      'kind',     p_kind,
      'status',   'deleted'
    );
  end if;

  -- Lock the asset row and read status as text.
  select status::text
    into v_asset_status
  from public.podcast_media_assets
  where asset_id = v_ptr_id
  for update;

  -- If the referenced asset is already deleted/replaced, still no-op.
  if v_asset_status is null or v_asset_status in ('deleted', 'replaced') then
    -- Ensure the pointer is null too (self-heal).
    if p_kind = 'audio' then
      update public.podcast_episodes set audio_asset_id   = null where episode_id = p_episode_id;
    else
      update public.podcast_episodes set artwork_asset_id = null where episode_id = p_episode_id;
    end if;
    return jsonb_build_object(
      'asset_id', v_ptr_id,
      'kind',     p_kind,
      'status',   'deleted'
    );
  end if;

  -- Soft-delete the asset and unset the pointer.
  update public.podcast_media_assets
  set status = 'deleted'
  where asset_id = v_ptr_id;

  if p_kind = 'audio' then
    update public.podcast_episodes set audio_asset_id   = null where episode_id = p_episode_id;
  else
    update public.podcast_episodes set artwork_asset_id = null where episode_id = p_episode_id;
  end if;

  return jsonb_build_object(
    'asset_id', v_ptr_id,
    'kind',     p_kind,
    'status',   'deleted'
  );
end;
$$;

revoke all on function public.delete_podcast_media(uuid, text) from public;
grant execute on function public.delete_podcast_media(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4) get_podcast_media_playback_url
--    DB-side visibility gate: returns storage coordinates only for
--    published episodes whose referenced asset is 'ready' + right kind.
--    Signed URL creation is the caller's responsibility (Storage API).
--    Callable by anon (public playback + artwork rendering).
-- ---------------------------------------------------------------------
create or replace function public.get_podcast_media_playback_url(
  p_episode_id uuid,
  p_kind       text
) returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ptr_id           uuid;
  v_storage_bucket   text;
  v_storage_path     text;
  v_mime_type        text;
  v_size_bytes       bigint;
  v_duration_seconds int;
begin
  if p_kind not in ('audio', 'artwork') then
    raise exception 'podcast_invalid_kind' using errcode = '22023';
  end if;

  -- Episode must be published. status compared via ::text to be tolerant
  -- of column type (varchar / text / future enum).
  if p_kind = 'audio' then
    select audio_asset_id into v_ptr_id
    from public.podcast_episodes
    where episode_id = p_episode_id and status::text = 'published';
  else
    select artwork_asset_id into v_ptr_id
    from public.podcast_episodes
    where episode_id = p_episode_id and status::text = 'published';
  end if;

  if v_ptr_id is null then
    return null;  -- Not published, or no pointer of that kind.
  end if;

  select storage_bucket,
         storage_path,
         mime_type,
         size_bytes,
         duration_seconds
    into v_storage_bucket,
         v_storage_path,
         v_mime_type,
         v_size_bytes,
         v_duration_seconds
  from public.podcast_media_assets
  where asset_id  = v_ptr_id
    and status::text = 'ready'
    and kind::text   = p_kind;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'storage_bucket',   v_storage_bucket,
    'storage_path',     v_storage_path,
    'mime_type',        v_mime_type,
    'size_bytes',       v_size_bytes,
    'duration_seconds', v_duration_seconds
  );
end;
$$;

revoke all on function public.get_podcast_media_playback_url(uuid, text) from public;
grant execute on function public.get_podcast_media_playback_url(uuid, text) to anon, authenticated;


-- =====================================================================
-- End of 0021.
-- =====================================================================
