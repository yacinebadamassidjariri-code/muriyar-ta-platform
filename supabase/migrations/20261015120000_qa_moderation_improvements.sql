-- =====================================================================
-- Ask Muriyar Ta — Migration 0005 — Moderation improvements
-- Adds:
--   1. question_display_draft column on raw_questions (for staging the
--      de-identified public text before publication).
--   2. question_unpublish() RPC — removes a question from public view,
--      reverts state to ANSWERED, records audit trail.
--   3. question_update_published() RPC — edits the public question text
--      and/or answer text in-place without touching the encrypted original.
--   4. Extends review_get_question() return set with:
--        - question_display_draft  (draft of public-facing question)
--        - published_slug          (slug if currently published)
--        - published_question      (live public question text)
--        - published_answer        (live public answer text)
--        - published_attribution   (live attribution label)
--        - published_at            (publication timestamp)
--   5. question_save_display_draft() RPC — saves the moderator's
--      working draft of the de-identified question text.
--   6. Moderator list view for the assignment dropdown:
--        qa_list_moderators() — returns active staff who can moderate.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------------
-- Guard: require_aal2() must exist.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'require_aal2'
  ) then
    raise exception
      'require_aal2() not found. Apply 20261010000000_aal2_enforcement.sql first.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Add question_display_draft to raw_questions
-- ---------------------------------------------------------------------------
alter table public.raw_questions
  add column if not exists question_display_draft text default null;

comment on column public.raw_questions.question_display_draft is
  'Moderator-authored de-identified question text for public display. '
  'Staged here before publication. NEVER auto-populated from question_text.';

-- ---------------------------------------------------------------------------
-- 2. RPC — question_save_display_draft()
-- Saves the moderator''s de-identified question draft. Does NOT publish.
-- Requires: question.review permission.
-- ---------------------------------------------------------------------------
create or replace function public.question_save_display_draft(
  p_raw_question_id   uuid,
  p_question_display  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.raw_questions%rowtype;
begin
  -- Permission check
  if not public.has_permission('question.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Validate input
  if btrim(coalesce(p_question_display, '')) = '' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if char_length(btrim(p_question_display)) > 2000 then
    raise exception 'invalid_input' using errcode = '23514',
      detail = 'question_display must be 2000 characters or fewer';
  end if;

  -- Fetch question
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- Moderator scope: assigned moderator or disposition permission
  if not public.has_permission('question.disposition') then
    if v_row.assigned_moderator_id is distinct from auth.uid() then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- Cannot edit after terminal states
  if v_row.current_state in ('REJECTED', 'ARCHIVED') then
    raise exception 'invalid_transition' using errcode = '23514',
      detail = 'Cannot save draft for a rejected or archived question';
  end if;

  -- NOTE: We deliberately do NOT copy from question_text.
  -- The draft must always be authored by the moderator.
  update public.raw_questions
  set question_display_draft = btrim(p_question_display)
  where raw_questions.raw_question_id = p_raw_question_id;
end;
$$;

revoke all on function public.question_save_display_draft(uuid, text) from public;
grant execute on function public.question_save_display_draft(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Extend review_get_question() to include draft + published content
-- The function is replaced entirely; logic inside is unchanged except for
-- the additional columns in the return set.
-- ---------------------------------------------------------------------------
drop function if exists public.review_get_question(uuid);

create or replace function public.review_get_question(
  p_raw_question_id uuid
)
returns table (
  raw_question_id          uuid,
  question_text_plain      text,
  char_count               integer,
  language_code            varchar(8),
  topic_id                 uuid,
  topic_slug               varchar(100),
  follow_up_to             uuid,
  consent_timestamp        timestamptz,
  current_state            varchar(20),
  assigned_moderator_id    uuid,
  risk_level               varchar(20),
  risk_flags               text[],
  moderation_notes         text,
  submission_timestamp     timestamptz,
  rejection_reason_code    varchar(100),
  is_escalated             boolean,
  -- new columns
  question_display_draft   text,
  published_slug           varchar(220),
  published_question       text,
  published_answer         text,
  published_attribution    varchar(200),
  published_at             timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_row   public.raw_questions%rowtype;
  v_key   text;
  v_pub   public.published_qa%rowtype;
begin
  -- AAL2 guard
  perform public.require_aal2();

  -- Permission check
  if not public.has_permission('question.raw.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Fetch question row
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- Fetch Vault key for decryption
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'question_body_key'
    limit 1;
  exception when others then
    raise exception 'encryption_key_unavailable' using errcode = '42501';
  end;

  if v_key is null then
    raise exception 'encryption_key_unavailable' using errcode = '42501';
  end if;

  -- Fetch published record if exists
  select * into v_pub
  from public.published_qa
  where published_qa.raw_question_id = p_raw_question_id;

  return query
  select
    v_row.raw_question_id,
    pgp_sym_decrypt(v_row.question_text, v_key)       as question_text_plain,
    v_row.char_count,
    v_row.language_code,
    v_row.topic_id,
    (select t.slug from public.qa_topics t where t.topic_id = v_row.topic_id),
    v_row.follow_up_to_published_qa_id,
    v_row.consent_timestamp,
    v_row.current_state,
    v_row.assigned_moderator_id,
    v_row.risk_level,
    v_row.risk_flags,
    v_row.moderation_notes,
    v_row.submission_timestamp,
    v_row.rejection_reason_code,
    coalesce((
      select bool_or(qst.is_escalated)
      from public.qa_state_transitions qst
      where qst.raw_question_id = v_row.raw_question_id
    ), false),
    -- new fields
    v_row.question_display_draft,
    v_pub.slug,
    v_pub.question_display,
    v_pub.answer_text,
    v_pub.attribution_label,
    v_pub.published_at;
end;
$$;

revoke all on function public.review_get_question(uuid) from public;
grant execute on function public.review_get_question(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC — question_unpublish()
-- Removes the question from public view. Reverts raw_questions.current_state
-- to ANSWERED so it can be corrected and re-published.
-- Requires: question.publish permission + AAL2.
-- Does NOT delete the raw question or the encrypted submission.
-- ---------------------------------------------------------------------------
create or replace function public.question_unpublish(
  p_raw_question_id uuid,
  p_note            text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    public.raw_questions%rowtype;
  v_pub_id uuid;
begin
  -- AAL2 guard
  perform public.require_aal2();

  -- Permission check
  if not public.has_permission('question.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Fetch question
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- Must be PUBLISHED to unpublish
  if v_row.current_state <> 'PUBLISHED' then
    raise exception 'invalid_transition' using errcode = '23514',
      detail = 'Question must be PUBLISHED to unpublish';
  end if;

  -- Remove from public_qa (captures slug for audit before delete)
  select published_qa_id into v_pub_id
  from public.published_qa
  where published_qa.raw_question_id = p_raw_question_id;

  delete from public.published_qa
  where published_qa.raw_question_id = p_raw_question_id;

  -- Revert state to ANSWERED so it can be corrected and re-published
  update public.raw_questions
  set current_state = 'ANSWERED'
  where raw_questions.raw_question_id = p_raw_question_id;

  -- State transition record
  insert into public.qa_state_transitions (
    raw_question_id, moderator_id, from_state, to_state, note
  ) values (
    p_raw_question_id,
    auth.uid(),
    'PUBLISHED',
    'ANSWERED',
    coalesce(btrim(p_note), 'Unpublished')
  );

  -- Audit log — no question content, only identifiers
  insert into audit.audit_log (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(),
    (select string_agg(r.name, ',') from public.user_role_assignments ura
     join public.roles r on r.role_id = ura.role_id
     where ura.user_id = auth.uid() and ura.revoked_at is null),
    'UNPUBLISH question_unpublish',
    'published_qa',
    coalesce(v_pub_id::text, 'unknown'),
    jsonb_build_object(
      'raw_question_id', p_raw_question_id,
      'language_code',   v_row.language_code
    );
end;
$$;

revoke all on function public.question_unpublish(uuid, text) from public;
grant execute on function public.question_unpublish(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC — question_update_published()
-- Edits the public-facing question text and/or answer text in published_qa.
-- Does NOT touch raw_questions.question_text (the encrypted original).
-- Requires: question.publish permission + AAL2.
-- ---------------------------------------------------------------------------
create or replace function public.question_update_published(
  p_raw_question_id   uuid,
  p_question_display  text,
  p_answer_text       text,
  p_note              text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    public.raw_questions%rowtype;
  v_pub_id uuid;
begin
  -- AAL2 guard
  perform public.require_aal2();

  -- Permission check
  if not public.has_permission('question.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Validation
  if btrim(coalesce(p_question_display, '')) = '' then
    raise exception 'invalid_input' using errcode = '23514',
      detail = 'question_display is required';
  end if;
  if btrim(coalesce(p_answer_text, '')) = '' then
    raise exception 'invalid_input' using errcode = '23514',
      detail = 'answer_text is required';
  end if;

  -- Fetch question
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  if v_row.current_state <> 'PUBLISHED' then
    raise exception 'invalid_transition' using errcode = '23514',
      detail = 'Question must be PUBLISHED to update published content';
  end if;

  -- Update published_qa — never touches raw encrypted question
  update public.published_qa
  set question_display = btrim(p_question_display),
      answer_text      = btrim(p_answer_text),
      updated_at       = now()
  where published_qa.raw_question_id = p_raw_question_id
  returning published_qa_id into v_pub_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- State transition record (state unchanged — just an audit event)
  insert into public.qa_state_transitions (
    raw_question_id, moderator_id, from_state, to_state, note
  ) values (
    p_raw_question_id,
    auth.uid(),
    'PUBLISHED',
    'PUBLISHED',
    coalesce(btrim(p_note), 'Edited published content')
  );

  -- Audit log
  insert into audit.audit_log (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(),
    (select string_agg(r.name, ',') from public.user_role_assignments ura
     join public.roles r on r.role_id = ura.role_id
     where ura.user_id = auth.uid() and ura.revoked_at is null),
    'UPDATE_PUBLISHED question_update_published',
    'published_qa',
    v_pub_id::text,
    jsonb_build_object(
      'raw_question_id', p_raw_question_id,
      'language_code',   v_row.language_code
    );
end;
$$;

revoke all on function public.question_update_published(uuid, text, text, text) from public;
grant execute on function public.question_update_published(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC — qa_list_moderators()
-- Returns active staff users for the assignment dropdown.
-- Requires: question.queue.read permission.
-- ---------------------------------------------------------------------------
create or replace function public.qa_list_moderators()
returns table (
  user_id      uuid,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('question.queue.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    u.user_id,
    coalesce(u.display_name, u.email, u.user_id::text) as display_name
  from public.users u
  where u.is_active = true
    and exists (
      select 1 from public.user_role_assignments ura
      join public.roles r on r.role_id = ura.role_id
      where ura.user_id = u.user_id
        and ura.revoked_at is null
        and r.name in ('super_admin', 'managing_editor', 'moderator')
    )
  order by display_name;
end;
$$;

revoke all on function public.qa_list_moderators() from public;
grant execute on function public.qa_list_moderators() to authenticated;

commit;
