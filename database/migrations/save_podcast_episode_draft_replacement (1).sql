-- =====================================================================
-- Complete replacement for public.save_podcast_episode_draft(uuid, jsonb).
-- Preserves every business rule from migration 0018:
--   • podcast.edit permission gate
--   • payload key whitelist (unknown → invalid_payload)
--   • create-or-update behavior (never changes status)
--   • merge existing values with payload (missing key = don't change)
--   • stable, namespaced error codes
--   • slug validation via public.slugify() + partial UNIQUE index
--   • language validation against supported_languages (is_active)
--   • series validation against public.podcast_series_slugs()
--   • episode_kind and content_advisory enum casts
--   • is_featured=true only when current status is 'published'
--   • NEVER writes published_at or published_by
--   • Returns the (new or existing) episode_id
-- Compatible with the existing saveDraftAction (no signature change).
-- =====================================================================

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

  -- Effective values (existing row overlaid with payload where present).
  v_title         text;
  v_slug          text;
  v_description   text;
  v_episode_sum   text;
  v_series_slug   text;
  v_episode_kind  text;
  v_language      text;
  v_advisory      text;
  v_featured      boolean;

  -- Presence flags — missing key on update means "leave field alone",
  -- not "clear it to null". Only set keys are considered.
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
  -- 1) Permission gate.
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
  -- 3) Resolve existing row (UPDATE) or fall through (CREATE).
  --    FOR UPDATE serializes concurrent saves of the same episode.
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
  --    Note: nullif(..., '') maps empty-string payload to NULL so the CMS
  --    can clear optional fields intentionally; missing keys keep existing.
  ----------------------------------------------------------------------
  v_title := case
    when v_has_title then nullif(btrim(p_payload ->> 'title'), '')
    else v_existing.title
  end;

  v_slug := case
  when v_has_slug then
    coalesce(
      nullif(public.slugify(p_payload ->> 'slug'), ''),
      v_existing.slug
    )
  else
    v_existing.slug
end;

  v_description := case
    when v_has_desc then nullif(p_payload ->> 'description', '')
    else v_existing.description
  end;

  v_episode_sum := case
    when v_has_summary then nullif(p_payload ->> 'episode_summary', '')
    else v_existing.episode_summary
  end;

  v_series_slug := case
    when v_has_series then nullif(p_payload ->> 'series_slug', '')
    else v_existing.series_slug
  end;

  v_episode_kind := case
    when v_has_kind then nullif(p_payload ->> 'episode_kind', '')
    else v_existing.episode_kind::text
  end;

  v_language := case
    when v_has_language then nullif(p_payload ->> 'language_code', '')
    else v_existing.language_code
  end;

  v_advisory := case
    when v_has_advisory then coalesce(nullif(p_payload ->> 'content_advisory', ''), 'none')
    when v_is_create   then 'none'
    else v_existing.content_advisory::text
  end;

  v_featured := case
    when v_has_featured then (p_payload ->> 'is_featured')::boolean
    when v_is_create   then false
    else coalesce(v_existing.is_featured, false)
  end;

  ----------------------------------------------------------------------
  -- 5) Validation (shared with publish; publish adds the publication-
  --    required check on top of this).
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
  -- The partial UNIQUE index backstops uniqueness (unique_violation below).
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

  -- Advisory: must be a valid enum value.
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
  --    Translates the partial-unique-index violation on slug into the
  --    canonical slug_taken error code.
  ----------------------------------------------------------------------
  if v_is_create then
    begin
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
    exception when unique_violation then
      raise exception 'slug_taken' using errcode = '23505';
    end;

    return v_new_id;
  else
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
        is_featured      = v_featured
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
