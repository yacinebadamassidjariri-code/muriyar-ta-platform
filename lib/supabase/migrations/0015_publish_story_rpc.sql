-- =====================================================================
-- Migration 0015 — publish_story RPC
-- Purpose: the SINGLE, permissioned, audited write path that turns an
-- APPROVED raw_submission into a PUBLISHED public story. Per the approved
-- specification, publication never happens as a side effect of approval — it
-- only ever happens through this explicit call.
--
-- Conventions (match submit_story / review_*):
--   • SECURITY DEFINER, owned by postgres, pinned search_path
--   • Permission re-checked inside the function (not trusted from the UI)
--   • EXECUTE granted to authenticated only (anon never reaches here)
--   • Errors are raised as short string codes the UI maps to localized text
--
-- Compatibility: no enum changes needed (the 'publish' action_type already
-- exists in moderation_action_type). Idempotent (CREATE OR REPLACE).
-- =====================================================================


-- ---------------------------------------------------------------------
-- slugify(text)  —  internal helper
-- Lowercase, ASCII-fold (best-effort via regex; no extension required),
-- collapse non-alphanumerics into single hyphens, trim, cap length.
-- IMMUTABLE so it's safe in indexes/expressions later if needed.
-- ---------------------------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select case
    when btrim(coalesce(p_text,'')) = '' then ''
    else left(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(p_text), '[''\u2018\u2019\u201C\u201D]', '', 'g'),
          '[^a-z0-9]+', '-', 'g'
        ),
        '(^-+|-+$)', '', 'g'
      ),
      80
    )
  end;
$$;


-- ---------------------------------------------------------------------
-- publish_story(...)
--   Inputs : as approved in the spec (Part A.2). p_edits is a jsonb ARRAY
--            of {edited_field, previous_value, new_value} objects.
--   Returns: (story_id uuid, slug text). NEVER returns source_submission_ref.
--   Errors : forbidden | not_found | not_approved | already_published |
--            title_required | body_too_short | unsupported_language |
--            invalid_tag | slug_taken
-- ---------------------------------------------------------------------
create or replace function public.publish_story(
  p_submission_id           uuid,
  p_title                   text,
  p_body                    text,
  p_slug                    text     default null,
  p_language_code           text     default null,
  p_region_id               integer  default null,
  p_issue_tag_ids           integer[] default null,
  p_featured_image_asset_id uuid     default null,
  p_seo_title               text     default null,
  p_seo_description         text     default null,
  p_read_time_minutes       smallint default null,
  p_author_display          text     default null,
  p_edits                   jsonb    default null,
  p_note                    text     default null
)
returns table (story_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub        public.raw_submissions%rowtype;
  v_lang       text;
  v_title      text := btrim(coalesce(p_title, ''));
  v_body       text := coalesce(p_body, '');
  v_body_chars integer := char_length(btrim(v_body));
  v_author     text := coalesce(nullif(btrim(coalesce(p_author_display,'')), ''), 'Muriyar Ta Team');
  v_note       text := nullif(btrim(coalesce(p_note,'')), '');
  v_user       uuid := auth.uid();
  v_caller_supplied_slug boolean := nullif(btrim(coalesce(p_slug,'')), '') is not null;
  v_base_slug  text;
  v_slug       text;
  v_n          integer := 1;
  v_story_id   uuid;
  v_bad_tag    integer;
  v_edit       jsonb;
  v_edit_count integer := 0;
  v_field      text;
  v_prev       text;
  v_new        text;
begin
  ---------------------------------------------------------------------
  -- 1) PERMISSION GATE  ------------------------------------------------
  -- story.publish is the ONLY permission that may create a published row.
  -- Independent of submission.disposition: an editor may publish even if
  -- they did not approve; a moderator without story.publish cannot reach
  -- this code path.
  ---------------------------------------------------------------------
  if not public.has_permission('story.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  ---------------------------------------------------------------------
  -- 2) LOCK & LOAD THE SUBMISSION  ------------------------------------
  -- FOR UPDATE serialises concurrent publish/disposition attempts on the
  -- same submission. Not found → not_found (P0002).
  ---------------------------------------------------------------------
  select * into v_sub
  from public.raw_submissions
  where submission_id = p_submission_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  ---------------------------------------------------------------------
  -- 3) STATE GATE — THE INVARIANT  ------------------------------------
  -- Publication is permitted ONLY from APPROVED. This is the structural
  -- enforcement of the "APPROVED and PUBLISHED are permanently separate
  -- states" rule: any other state (PENDING, IN_REVIEW, NEEDS_EDIT,
  -- REJECTED, PUBLISHED, ARCHIVED) is rejected here, in the database,
  -- so no UI shortcut can bypass it.
  ---------------------------------------------------------------------
  if v_sub.current_state <> 'APPROVED' then
    raise exception 'not_approved' using errcode = '22023';
  end if;

  ---------------------------------------------------------------------
  -- 4) ONE-TO-ONE GUARD  ----------------------------------------------
  -- Explicit pre-check (the UNIQUE on source_submission_ref is the
  -- backstop). Yields a clean error on double-submit / re-publish.
  ---------------------------------------------------------------------
  if exists (
    select 1 from public.published_stories
    where source_submission_ref = p_submission_id
  ) then
    raise exception 'already_published' using errcode = '23505';
  end if;

  ---------------------------------------------------------------------
  -- 5) CONTENT VALIDATION  --------------------------------------------
  -- Public-side floors: non-empty title, body ≥ 50 chars (mirrors the
  -- raw-submission floor — anything shorter isn't a story).
  ---------------------------------------------------------------------
  if v_title = '' or char_length(v_title) > 200 then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if v_body_chars < 50 then
    raise exception 'body_too_short' using errcode = '23514';
  end if;

  ---------------------------------------------------------------------
  -- 6) LANGUAGE VALIDATION  -------------------------------------------
  -- Default to the submission's language; must be active.
  ---------------------------------------------------------------------
  v_lang := coalesce(nullif(btrim(coalesce(p_language_code,'')), ''), v_sub.language_code);
  if not exists (
    select 1 from public.supported_languages
    where language_code = v_lang and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  ---------------------------------------------------------------------
  -- 7) TAG VALIDATION  ------------------------------------------------
  -- Every supplied tag id must exist; otherwise fail with the offender.
  ---------------------------------------------------------------------
  if p_issue_tag_ids is not null and array_length(p_issue_tag_ids, 1) > 0 then
    select t into v_bad_tag
    from unnest(p_issue_tag_ids) as t
    where not exists (select 1 from public.issue_tags where tag_id = t);
    if v_bad_tag is not null then
      raise exception 'invalid_tag' using errcode = '23503';
    end if;
  end if;

  ---------------------------------------------------------------------
  -- 8) SLUG RESOLUTION  -----------------------------------------------
  -- Editor-supplied slug → must be unique (raise slug_taken if not).
  -- Auto-derived slug → silently suffix -2, -3, … so a title collision
  -- never blocks publishing.
  ---------------------------------------------------------------------
  v_base_slug := coalesce(
    nullif(public.slugify(p_slug), ''),
    nullif(public.slugify(p_title), ''),
    -- Stable fallback for non-Latin titles: a 12-char token from a uuid.
    left(replace(gen_random_uuid()::text, '-', ''), 12)
  );

  if v_caller_supplied_slug then
    v_slug := v_base_slug;
    if exists (select 1 from public.published_stories where slug = v_slug) then
      raise exception 'slug_taken' using errcode = '23505';
    end if;
  else
    v_slug := v_base_slug;
    while exists (select 1 from public.published_stories where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := left(v_base_slug, 76) || '-' || v_n::text;  -- keep within 80
    end loop;
  end if;

  ---------------------------------------------------------------------
  -- 9) INSERT THE PUBLIC STORY  ---------------------------------------
  -- Writes only public columns. source_submission_ref is set ONCE here
  -- and is immutable thereafter. The aud_pubstory AFTER trigger fires
  -- automatically and writes a scrubbed audit.audit_log entry.
  ---------------------------------------------------------------------
  insert into public.published_stories (
    source_submission_ref, title, slug, body_text, language_code, region_id,
    featured_image_asset_id, read_time_minutes, seo_title, seo_description,
    author_display, status, published_at, published_by
  ) values (
    p_submission_id, v_title, v_slug, v_body, v_lang, p_region_id,
    p_featured_image_asset_id, p_read_time_minutes, p_seo_title, p_seo_description,
    v_author, 'published', now(), v_user
  )
  returning published_stories.story_id into v_story_id;

  ---------------------------------------------------------------------
  -- 10) TAGS  ---------------------------------------------------------
  ---------------------------------------------------------------------
  if p_issue_tag_ids is not null and array_length(p_issue_tag_ids, 1) > 0 then
    insert into public.published_story_tags (story_id, tag_id)
    select v_story_id, t from unnest(p_issue_tag_ids) as t
    on conflict do nothing;
  end if;

  ---------------------------------------------------------------------
  -- 11) DE-IDENTIFICATION TRAIL  --------------------------------------
  -- p_edits is jsonb ARRAY of {edited_field, previous_value, new_value}.
  -- Inserted in the same transaction so "published" and "we recorded how
  -- it was de-identified" never diverge. Append-only by table design.
  -- Per-element bounds keep this from being abused.
  ---------------------------------------------------------------------
  if p_edits is not null and jsonb_typeof(p_edits) = 'array' then
    for v_edit in select * from jsonb_array_elements(p_edits) loop
      exit when v_edit_count >= 100;  -- hard cap
      v_field := nullif(btrim(coalesce(v_edit ->> 'edited_field','')), '');
      v_prev  := coalesce(v_edit ->> 'previous_value', '');
      v_new   := coalesce(v_edit ->> 'new_value', '');
      -- Skip malformed or no-op rows (NULL field, or before==after).
      if v_field is null then continue; end if;
      if v_prev = v_new then continue; end if;
      -- Length guards (~64KB previous/new is plenty for editorial use).
      if char_length(v_field) > 40
         or char_length(v_prev) > 65536
         or char_length(v_new)  > 65536 then
        continue;
      end if;
      insert into public.submission_edits(
        submission_id, moderator_id, edited_field, previous_value, new_value
      ) values (
        p_submission_id, v_user, v_field, v_prev, v_new
      );
      v_edit_count := v_edit_count + 1;
    end loop;
  end if;

  ---------------------------------------------------------------------
  -- 12) STATE TRANSITION: APPROVED → PUBLISHED  -----------------------
  -- Only current_state is set here. The existing BEFORE-UPDATE triggers
  -- (set_resolved_at, set_updated_at) stamp resolved_at / updated_at.
  -- The RPC never writes those columns directly.
  ---------------------------------------------------------------------
  update public.raw_submissions
  set current_state = 'PUBLISHED'
  where submission_id = p_submission_id;

  ---------------------------------------------------------------------
  -- 13) IMMUTABLE PER-SUBMISSION TRAIL  -------------------------------
  -- moderator_id is forced to auth.uid(); is_crisis_flag is irrelevant
  -- to publishing. action_type 'publish' already exists in the enum.
  ---------------------------------------------------------------------
  insert into public.moderation_actions (
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, v_user, 'publish'::moderation_action_type,
    'APPROVED', 'PUBLISHED', v_note, false
  );

  ---------------------------------------------------------------------
  -- 14) RETURN  -------------------------------------------------------
  -- Only the public identifiers. source_submission_ref is NEVER returned.
  ---------------------------------------------------------------------
  return query select v_story_id, v_slug;
end;
$$;


-- ---------------------------------------------------------------------
-- Grants: authenticated only. The story.publish permission check inside
-- the function is the real authorization gate; anon never reaches this.
-- ---------------------------------------------------------------------
revoke all on function public.publish_story(
  uuid, text, text, text, text, integer, integer[], uuid,
  text, text, smallint, text, jsonb, text
) from public;

grant execute on function public.publish_story(
  uuid, text, text, text, text, integer, integer[], uuid,
  text, text, smallint, text, jsonb, text
) to authenticated;

revoke all on function public.slugify(text) from public;
grant execute on function public.slugify(text) to authenticated;
