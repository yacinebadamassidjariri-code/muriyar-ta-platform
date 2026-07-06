-- =====================================================================
-- Migration 0018 — Podcast CMS metadata RPCs (Phase F1.2)
-- Sole write path for the editorial CMS into podcast_episodes. Three RPCs:
--   • save_podcast_episode_draft(uuid|null, jsonb) → uuid
--   • publish_podcast_episode(uuid, jsonb)        → text   ('published')
--   • unpublish_podcast_episode(uuid)             → text   ('draft')
--
-- Conventions (match submit_story / review_* / publish_story):
--   • SECURITY DEFINER owned by postgres, pinned search_path
--   • Permission re-checked inside each function (podcast.edit)
--   • EXECUTE granted to authenticated only (anon never reaches here)
--   • Errors are raised as short string codes the UI maps to localized text
--
-- This migration adds NO new tables, enums, views, triggers, or RLS. It only:
--   • Seeds the podcast.edit permission and grants it to administrator
--   • Adds public.podcast_series_slugs() — the canonical mirror of the TS
--     series list in lib/content/podcast-series.ts
--   • Creates the three RPCs above
-- All editorial history is captured by the existing aud_podcast trigger
-- writing scrubbed entries to audit.audit_log.
--
-- Compatibility: depends on 0001–0017. Idempotent (CREATE OR REPLACE; guarded
-- INSERTs). Transaction-wrapped.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Permission seed: podcast.edit (idempotent).
--    Granted to administrator only in this phase. Future editor/publisher
--    roles can be granted separately as additive role_permissions rows.
-- ---------------------------------------------------------------------
insert into public.permissions (code, description)
select 'podcast.edit', 'Create, edit, publish, and unpublish podcast episodes'
where not exists (
  select 1 from public.permissions where code = 'podcast.edit'
);

insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r
join public.permissions p on p.code = 'podcast.edit'
where r.name = 'administrator'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_id = r.role_id and rp.permission_id = p.permission_id
  );


-- ---------------------------------------------------------------------
-- 2) Canonical series allow-list (mirror of lib/content/podcast-series.ts).
--    IMMUTABLE so it's safe in expressions and the planner can inline it.
--    Keep this list aligned with the TS file; a CI check (or manual review)
--    compares them at release time. Editing it here without updating the TS
--    file (or vice-versa) is a release-blocking drift.
-- ---------------------------------------------------------------------
create or replace function public.podcast_series_slugs()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array[
    'anonymous-voices',
    'beyond-the-story',
    'breaking-the-silence',
    'youth-voices'
  ]::text[];
$$;

revoke all on function public.podcast_series_slugs() from public;
grant execute on function public.podcast_series_slugs() to authenticated;


-- ---------------------------------------------------------------------
-- Helpers used by all three RPCs (declared inline as functions so they
-- are pinned alongside the RPCs and trivially reusable).
-- ---------------------------------------------------------------------

-- Returns true if the jsonb object's top-level keys are all in the allow-list.
create or replace function public._pod_payload_keys_ok(p_payload jsonb, p_allowed text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_payload, '{}'::jsonb) = '{}'::jsonb
      or not exists (
        select 1
        from jsonb_object_keys(p_payload) as k
        where k <> all (p_allowed)
      );
$$;

revoke all on function public._pod_payload_keys_ok(jsonb, text[]) from public;


-- ---------------------------------------------------------------------
-- 3) save_podcast_episode_draft
--    Create-or-update. NEVER changes status. NEVER writes published_at or
--    published_by — those record the first publication event and belong
--    exclusively to publish_podcast_episode. Returns the (new or existing)
--    episode_id.
-- ---------------------------------------------------------------------
create or replace function public.save_podcast_episode_draft(
  p_episode_id uuid default null,
  p_payload    jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed_keys constant text[] := array[
    'title','slug','description','episode_summary',
    'series_slug','episode_kind','language_code',
    'content_advisory','is_featured'
  ];
  v_existing      public.podcast_episodes%rowtype;
  v_is_create     boolean := p_episode_id is null;
  v_user          uuid    := auth.uid();

  -- Effective values (existing row, overlaid with payload where present).
  v_title         text;
  v_slug          text;
  v_description   text;
  v_episode_sum   text;
  v_series_slug   text;
  v_episode_kind  text;
  v_language      text;
  v_advisory      text;
  v_featured      boolean;

  -- Track which payload keys were actually present (so missing-on-update
  -- means "don't change" rather than "set to null").
  v_has_title      boolean := p_payload ? 'title';
  v_has_slug       boolean := p_payload ? 'slug';
  v_has_desc       boolean := p_payload ? 'description';
  v_has_summary    boolean := p_payload ? 'episode_summary';
  v_has_series     boolean := p_payload ? 'series_slug';
  v_has_kind       boolean := p_payload ? 'episode_kind';
  v_has_language   boolean := p_payload ? 'language_code';
  v_has_advisory   boolean := p_payload ? 'content_advisory';
  v_has_featured   boolean := p_payload ? 'is_featured';

  v_status_for_featured_check text;
  v_new_id        uuid;
begin
  ----------------------------------------------------------------------
  -- 1) Permission gate
  ----------------------------------------------------------------------
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  ----------------------------------------------------------------------
  -- 2) Payload key whitelist (unknown keys are an error, not ignored).
  ----------------------------------------------------------------------
  if p_payload is null then
    p_payload := '{}'::jsonb;
  elsif jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if not public._pod_payload_keys_ok(p_payload, v_allowed_keys) then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  ----------------------------------------------------------------------
  -- 3) Resolve current row (UPDATE) or fall through (CREATE).
  --    Lock the row so concurrent saves serialize.
  ----------------------------------------------------------------------
  if not v_is_create then
    select * into v_existing
    from public.podcast_episodes
    where episode_id = p_episode_id
    for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;

  ----------------------------------------------------------------------
  -- 4) Compute effective values: existing overlaid with payload-when-present.
  ----------------------------------------------------------------------
  v_title       := case when v_has_title    then nullif(btrim(p_payload ->> 'title'), '')
                        else v_existing.title end;
  v_slug        := case when v_has_slug     then nullif(public.slugify(p_payload ->> 'slug'), '')
                        else v_existing.slug end;
  v_description := case when v_has_desc     then nullif(p_payload ->> 'description', '')
                        else v_existing.description end;
  v_episode_sum := case when v_has_summary  then nullif(p_payload ->> 'episode_summary', '')
                        else v_existing.episode_summary end;
  v_series_slug := case when v_has_series   then nullif(p_payload ->> 'series_slug', '')
                        else v_existing.series_slug end;
  v_episode_kind := case when v_has_kind    then nullif(p_payload ->> 'episode_kind', '')
                        else v_existing.episode_kind::text end;
  v_language    := case when v_has_language then nullif(p_payload ->> 'language_code', '')
                        else v_existing.language_code end;
  v_advisory    := case when v_has_advisory then coalesce(p_payload ->> 'content_advisory', 'none')
                        else v_existing.content_advisory::text end;
  v_featured    := case when v_has_featured then (p_payload ->> 'is_featured')::boolean
                        else coalesce(v_existing.is_featured, false) end;

  ----------------------------------------------------------------------
  -- 5) Validation (shared with publish; publish adds the publication-required check).
  ----------------------------------------------------------------------

  -- Title: required on CREATE, and required-when-present on UPDATE.
  if v_is_create or v_has_title then
    if v_title is null or char_length(v_title) = 0 then
      raise exception 'title_required' using errcode = '23514';
    end if;
    if char_length(v_title) > 200 then
      raise exception 'title_required' using errcode = '23514';
    end if;
  end if;

  if v_description is not null and char_length(v_description) > 1000 then
    raise exception 'podcast_description_too_long' using errcode = '22001';
  end if;

  if v_episode_sum is not null and char_length(v_episode_sum) > 8000 then
    raise exception 'podcast_summary_too_long' using errcode = '22001';
  end if;

  -- Slug: format-checked on every write that sets a non-null slug.
  if v_slug is not null then
    if v_slug !~ '^[a-z0-9-]+$' or char_length(v_slug) < 1 or char_length(v_slug) > 80 then
      raise exception 'slug_format' using errcode = '23514';
    end if;
  end if;

  -- Language: must be active in supported_languages whenever provided/present.
  if v_language is not null then
    if not exists (
      select 1 from public.supported_languages
      where language_code = v_language and is_active = true
    ) then
      raise exception 'unsupported_language' using errcode = '23503';
    end if;
  end if;

  -- Series: must be in the canonical allow-list (or NULL).
  if v_series_slug is not null then
    if not (v_series_slug = any (public.podcast_series_slugs())) then
      raise exception 'podcast_invalid_series' using errcode = '23503';
    end if;
  end if;

  -- Episode kind: must cast to enum (or NULL).
  if v_episode_kind is not null then
    begin
      perform v_episode_kind::public.podcast_episode_kind;
    exception when invalid_text_representation then
      raise exception 'podcast_invalid_kind' using errcode = '22023';
    end;
  end if;

  -- Advisory: must be a valid enum value (default 'none').
  begin
    perform v_advisory::public.podcast_content_advisory;
  exception when invalid_text_representation then
    raise exception 'podcast_invalid_advisory' using errcode = '22023';
  end;

  -- is_featured: true only when row's CURRENT status is 'published'.
  if v_has_featured then
    v_status_for_featured_check := case
      when v_is_create then 'draft'
      else v_existing.status::text
    end;
    if v_featured = true and v_status_for_featured_check <> 'published' then
      raise exception 'podcast_featured_requires_published' using errcode = '23514';
    end if;
  end if;

  ----------------------------------------------------------------------
  -- 6) Write. INSERT on create (status='draft'), UPDATE otherwise.
  --    NEVER touches published_at or published_by.
  ----------------------------------------------------------------------
  if v_is_create then
    insert into public.podcast_episodes (
      title, slug, description, episode_summary,
      series_slug, episode_kind, language_code,
      content_advisory, is_featured, status, created_by
    ) values (
      v_title, v_slug, v_description, v_episode_sum,
      v_series_slug,
      v_episode_kind::public.podcast_episode_kind,
      coalesce(v_language, 'en'),
      v_advisory::public.podcast_content_advisory,
      coalesce(v_featured, false),
      'draft',
      v_user
    )
    returning episode_id into v_new_id;

    return v_new_id;
  else
    -- Translate the unique-violation on slug into the canonical slug_taken code.
    begin
      update public.podcast_episodes set
        title            = v_title,
        slug             = v_slug,
        description      = v_description,
        episode_summary  = v_episode_sum,
        series_slug      = v_series_slug,
        episode_kind     = v_episode_kind::public.podcast_episode_kind,
        language_code    = coalesce(v_language, language_code),
        content_advisory = v_advisory::public.podcast_content_advisory,
        is_featured      = coalesce(v_featured, is_featured)
      where episode_id = p_episode_id;
    exception when unique_violation then
      raise exception 'slug_taken' using errcode = '23505';
    end;
    return p_episode_id;
  end if;
end;
$$;

revoke all on function public.save_podcast_episode_draft(uuid, jsonb) from public;
grant execute on function public.save_podcast_episode_draft(uuid, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 4) publish_podcast_episode
--    Re-runs save_podcast_episode_draft's payload validation, then enforces
--    the additional publication-required check (all of title, slug, language,
--    series, kind, advisory must be present and valid). State gate: must be
--    'draft'. Sets status='published', published_at=now(), published_by=auth.uid().
-- ---------------------------------------------------------------------
create or replace function public.publish_podcast_episode(
  p_episode_id uuid,
  p_payload    jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.podcast_episodes%rowtype;
begin
  ----------------------------------------------------------------------
  -- Permission & lock first (so state can't race).
  ----------------------------------------------------------------------
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- We need to validate state BEFORE running the (possibly extensive)
  -- save flow, so check the row exists and is a draft first.
  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'draft' then
    raise exception 'podcast_not_draft' using errcode = '22023';
  end if;

  ----------------------------------------------------------------------
  -- Apply payload via the draft RPC (full payload validation, no status change).
  -- If anything is wrong, the inner RAISE bubbles up unchanged.
  ----------------------------------------------------------------------
  perform public.save_podcast_episode_draft(p_episode_id, coalesce(p_payload, '{}'::jsonb));

  -- Re-read the row with the saved changes.
  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;

  ----------------------------------------------------------------------
  -- Publication-required metadata. Any missing/invalid field raises with
  -- the same error code that save would have raised, so the UI maps it
  -- uniformly. (Title and advisory are NOT NULL via Save above; slug,
  -- language, series, kind we must explicitly require here.)
  ----------------------------------------------------------------------
  if v_row.title is null or char_length(v_row.title) = 0 then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if v_row.slug is null then
    raise exception 'slug_format' using errcode = '23514';
  end if;
  if v_row.language_code is null then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;
  if v_row.series_slug is null then
    raise exception 'podcast_invalid_series' using errcode = '23503';
  end if;
  if v_row.episode_kind is null then
    raise exception 'podcast_invalid_kind' using errcode = '22023';
  end if;

  ----------------------------------------------------------------------
  -- Transition to published. Stamps the first-publication fields.
  ----------------------------------------------------------------------
  update public.podcast_episodes
  set
    status        = 'published',
    published_at  = now(),
    published_by  = v_user
  where episode_id = p_episode_id;

  return 'published';
end;
$$;

revoke all on function public.publish_podcast_episode(uuid, jsonb) from public;
grant execute on function public.publish_podcast_episode(uuid, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 5) unpublish_podcast_episode
--    Pure state transition (no payload). State gate: must be 'published'.
--    Defensively clears is_featured before flipping status, to avoid the
--    pod_featured_requires_published_chk CHECK firing on the UPDATE.
--    Preserves published_at/published_by as a historical record of the
--    first publication event.
-- ---------------------------------------------------------------------
create or replace function public.unpublish_podcast_episode(
  p_episode_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.podcast_episodes%rowtype;
begin
  if not public.has_permission('podcast.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'published' then
    raise exception 'podcast_not_published' using errcode = '22023';
  end if;

  -- Defensive: clear is_featured BEFORE changing status so the CHECK
  -- constraint pod_featured_requires_published_chk never fires as an
  -- opaque error mid-update.
  update public.podcast_episodes
  set
    is_featured = false,
    status      = 'draft'
  where episode_id = p_episode_id;

  return 'draft';
end;
$$;

revoke all on function public.unpublish_podcast_episode(uuid) from public;
grant execute on function public.unpublish_podcast_episode(uuid) to authenticated;


-- =====================================================================
-- End of 0018 — verification queries, expected results, and rollback plan
-- are documented in the accompanying spec.
-- =====================================================================
