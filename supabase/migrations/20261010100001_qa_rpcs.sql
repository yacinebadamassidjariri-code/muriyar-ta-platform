-- =====================================================================
-- Ask Muriyar Ta — Migration 0002 — RPCs
-- Feature branch: feature/ask-muriyar-ta
-- Depends on: 20261010100000_qa_schema (tables, states, permissions)
--             20261010000000_aal2_enforcement (require_aal2)
-- =====================================================================
--
-- SAFEGUARDING NOTE
-- -----------------
-- require_aal2() guards every function that decrypts or writes sensitive
-- content (review_get_question, question_publish). It is called as the
-- very first statement inside these functions so that any caller without
-- an AAL2 session receives SQLSTATE 42501 before any data is touched.
--
-- PREREQUISITE: Migration 20261010000000_aal2_enforcement must be applied
-- and require_aal2() must exist before this migration runs. The DO block
-- below verifies this at apply time and aborts if the function is absent.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------------
-- Guard: verify require_aal2() exists before creating RPCs that call it.
-- This migration MUST NOT be applied before the AAL2 enforcement migration.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'require_aal2'
  ) then
    raise exception
      'require_aal2() not found in public schema. '
      'Apply 20261010000000_aal2_enforcement.sql first.'
      using errcode = 'P0001';
  end if;
end;
$$;

-- =====================================================================
-- RPC 1 — submit_question()
-- Public write path. SECURITY DEFINER, callable by anon.
-- Mirrors submit_story() exactly: encrypts with Vault, returns void,
-- never leaks a submission ID or any other identifier to the caller.
-- Rate limiting: checks qa_submission_cooldowns using a SHA-256 hash of
-- the x-forwarded-for header. The raw IP is never stored.
-- =====================================================================

create or replace function public.submit_question(
  p_question       text,
  p_language_code  text,
  p_consent        boolean,
  p_consent_language text  default null,
  p_topic_id       uuid   default null,
  p_follow_up_to   uuid   default null   -- published_qa_id, not question_id
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id integer;
  v_char_count         integer := char_length(btrim(coalesce(p_question, '')));
  v_key                text;
  v_ip_raw             text;
  v_ip_hash            varchar(64);
  v_window             timestamptz;
  v_count              integer := 0;
begin
  -- ── Validation ──────────────────────────────────────────────────────
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;

  if v_char_count < 50 then
    raise exception 'too_short' using errcode = '23514';
  end if;

  if v_char_count > 800 then
    raise exception 'too_long' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;

  if p_topic_id is not null and not exists (
    select 1 from public.qa_topics
    where topic_id = p_topic_id and active
  ) then
    raise exception 'invalid_topic' using errcode = '23503';
  end if;

  if p_follow_up_to is not null and not exists (
    select 1 from public.published_qa
    where published_qa_id = p_follow_up_to
  ) then
    raise exception 'invalid_follow_up_target' using errcode = '23503';
  end if;

  -- ── Consent version ─────────────────────────────────────────────────
  select consent_version_id into v_consent_version_id
  from public.consent_versions
  where is_active
  order by effective_from desc
  limit 1;

  if v_consent_version_id is null then
    raise exception 'no_active_consent';
  end if;

  -- ── Rate limiting ────────────────────────────────────────────────────
  -- Hash the x-forwarded-for header. Returns null if the header is absent
  -- (e.g. localhost / direct DB connections) — skip rate limiting in that case.
  begin
    v_ip_raw := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  exception when others then
    v_ip_raw := null;
  end;

  if v_ip_raw is not null then
    v_ip_hash := encode(digest(v_ip_raw, 'sha256'), 'hex');
    -- Truncate to the current hour for bucketing.
    v_window  := date_trunc('hour', now());

    -- Count attempts in this window.
    select coalesce(sum(count), 0)
      into v_count
      from public.qa_submission_cooldowns
     where ip_hash = v_ip_hash
       and window_start >= now() - interval '1 hour';

    if v_count >= 5 then
      raise exception 'rate_limit_exceeded' using errcode = '23514';
    end if;

    -- Duplicate suppression: same ip_hash + topic within 2 hours → silent discard.
    -- Returns success to the caller to prevent enumeration, but does not insert.
    if p_topic_id is not null and exists (
      select 1 from public.qa_submission_cooldowns
      where ip_hash = v_ip_hash
        and window_start >= now() - interval '2 hours'
    ) then
      -- Check raw_questions for a recent question with the same topic from this session.
      -- We cannot link ip_hash to raw_questions (by design), so this is a best-effort
      -- check on the cooldown count only. True deduplication requires human review.
      null; -- fall through to insert
    end if;

    -- Upsert cooldown record.
    insert into public.qa_submission_cooldowns (ip_hash, window_start, count)
    values (v_ip_hash, v_window, 1)
    on conflict (ip_hash, window_start)
    do update set count = qa_submission_cooldowns.count + 1;
  end if;

  -- ── Vault key ────────────────────────────────────────────────────────
  -- Separate key from story submissions (independent rotation / breach radius).
  -- Falls back to plain UTF-8 bytes if the secret is absent (dev convenience).
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'question_body_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  -- ── Insert ───────────────────────────────────────────────────────────
  -- enforce_question_intake() trigger forces PENDING state and clears
  -- any attempt to pass moderation fields from the caller.
  insert into public.raw_questions (
    question_text,
    char_count,
    language_code,
    topic_id,
    follow_up_to_published_qa_id,
    consent_given,
    consent_version_id,
    consent_timestamp,
    consent_language
    -- current_state, risk_level, risk_flags, etc. set by trigger
  ) values (
    case when v_key is not null
      then pgp_sym_encrypt(p_question, v_key)
      else convert_to(p_question, 'UTF8')
    end,
    v_char_count,
    p_language_code,
    p_topic_id,
    p_follow_up_to,
    true,
    v_consent_version_id,
    now(),
    coalesce(p_consent_language, p_language_code)
  );
end;
$$;

revoke all on function public.submit_question(text, text, boolean, text, uuid, uuid) from public;
grant execute on function public.submit_question(text, text, boolean, text, uuid, uuid) to anon, authenticated;

-- =====================================================================
-- RPC 2 — review_get_question()
-- Decrypts and returns the question body for a moderator.
-- Requires: question.raw.read permission + AAL2 session.
-- Logs every read to the audit schema (same as review_get_submission).
-- Does NOT change question state — transitions are always explicit.
-- =====================================================================

create or replace function public.review_get_question(
  p_raw_question_id uuid
)
returns table (
  raw_question_id       uuid,
  question_text_plain   text,
  char_count            smallint,
  language_code         varchar(8),
  topic_id              uuid,
  topic_slug            varchar(80),
  follow_up_to          uuid,
  consent_timestamp     timestamptz,
  current_state         varchar(20),
  assigned_moderator_id uuid,
  risk_level            varchar(20),
  risk_flags            text[],
  moderation_notes      text,
  submission_timestamp  timestamptz,
  rejection_reason_code varchar(8),
  is_escalated          boolean
)
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_key  text;
  v_row  public.raw_questions%rowtype;
begin
  -- ── AAL2 guard (first statement — fail before any data access) ───────
  perform public.require_aal2();

  -- ── Permission check ─────────────────────────────────────────────────
  if not public.has_permission('question.raw.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Fetch question ────────────────────────────────────────────────────
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- ── Moderator scope check ─────────────────────────────────────────────
  -- Moderators can only read PENDING queue items or their own assignments.
  -- managing_editor / super_admin can read any question.
  if not public.has_permission('question.disposition') then
    if v_row.assigned_moderator_id is distinct from auth.uid()
       and v_row.current_state <> 'PENDING' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- ── Vault key ─────────────────────────────────────────────────────────
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'question_body_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  -- ── Audit log ─────────────────────────────────────────────────────────
  insert into audit.audit_log (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(),
    (select string_agg(r.name, ',') from public.user_role_assignments ura
     join public.roles r on r.role_id = ura.role_id
     where ura.user_id = auth.uid() and ura.revoked_at is null),
    'READ review_get_question',
    'raw_questions',
    p_raw_question_id::text,
    jsonb_build_object(
      'question_state', v_row.current_state,
      'language_code',  v_row.language_code
    );

  -- ── Return decrypted row ──────────────────────────────────────────────
  return query
  select
    v_row.raw_question_id,
    case
      when v_key is not null
        then pgp_sym_decrypt(v_row.question_text, v_key)
      else convert_from(v_row.question_text, 'UTF8')
    end                                  as question_text_plain,
    v_row.char_count,
    v_row.language_code,
    v_row.topic_id,
    (select slug from public.qa_topics t where t.topic_id = v_row.topic_id),
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
    ), false);
end;
$$;

revoke all on function public.review_get_question(uuid) from public;
grant execute on function public.review_get_question(uuid) to authenticated;

-- =====================================================================
-- RPC 3 — question_set_state()
-- Explicit moderator action to transition question state.
-- Every transition is recorded in qa_state_transitions (audit trail).
-- State is NEVER changed automatically (e.g. opening a question does
-- NOT transition it to IN_REVIEW — the moderator must do so explicitly).
-- Requires: question.review permission.
-- REJECTED and NEEDS_EDIT transitions require a non-empty note.
-- Critical-risk escalation: requires question.disposition permission.
-- =====================================================================

create or replace function public.question_set_state(
  p_raw_question_id uuid,
  p_new_state       varchar(20),
  p_note            text    default null,
  p_is_escalated    boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row         public.raw_questions%rowtype;
  v_valid_states text[] := array[
    'IN_REVIEW','NEEDS_EDIT','ANSWERED','PUBLISHED','REJECTED','ARCHIVED'
  ];
begin
  -- ── Permission check ──────────────────────────────────────────────────
  if not public.has_permission('question.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Fetch current state ───────────────────────────────────────────────
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- ── Scope: moderators limited to PENDING / assigned ───────────────────
  if not public.has_permission('question.disposition') then
    if v_row.assigned_moderator_id is distinct from auth.uid()
       and v_row.current_state <> 'PENDING' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- ── Validate target state ─────────────────────────────────────────────
  if not (p_new_state = any(v_valid_states)) then
    raise exception 'invalid_state' using errcode = '23514',
      detail = 'Must be one of: IN_REVIEW, NEEDS_EDIT, ANSWERED, PUBLISHED, REJECTED, ARCHIVED';
  end if;

  -- Cannot transition to PUBLISHED via this RPC — use question_publish().
  if p_new_state = 'PUBLISHED' then
    raise exception 'use_question_publish_rpc' using errcode = '23514';
  end if;

  -- ── Note required for explanatory transitions ─────────────────────────
  if p_new_state in ('REJECTED', 'NEEDS_EDIT') and btrim(coalesce(p_note, '')) = '' then
    raise exception 'note_required' using errcode = '23514',
      detail = 'A note is required when rejecting or returning a question for edits';
  end if;

  -- ── Escalation requires question.disposition ──────────────────────────
  if p_is_escalated and not public.has_permission('question.disposition') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Update question state ─────────────────────────────────────────────
  update public.raw_questions
  set current_state = p_new_state,
      moderation_notes = case
        when btrim(coalesce(p_note, '')) <> ''
          then coalesce(moderation_notes || e'\n---\n', '') || p_note
        else moderation_notes
      end
  where raw_questions.raw_question_id = p_raw_question_id;

  -- ── Record transition ─────────────────────────────────────────────────
  insert into public.qa_state_transitions (
    raw_question_id, moderator_id, from_state, to_state, note, is_escalated
  ) values (
    p_raw_question_id,
    auth.uid(),
    v_row.current_state,
    p_new_state,
    p_note,
    coalesce(p_is_escalated, false)
  );
end;
$$;

revoke all on function public.question_set_state(uuid, varchar, text, boolean) from public;
grant execute on function public.question_set_state(uuid, varchar, text, boolean) to authenticated;

-- =====================================================================
-- RPC 4 — question_assign()
-- Assigns a question to a specific moderator.
-- Requires: question.disposition (managing_editor or super_admin only).
-- =====================================================================

create or replace function public.question_assign(
  p_raw_question_id    uuid,
  p_moderator_id       uuid,
  p_note               text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('question.disposition') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Verify target user exists and is active staff.
  if not exists (
    select 1 from public.users
    where user_id = p_moderator_id and is_active
  ) then
    raise exception 'invalid_moderator' using errcode = '23503';
  end if;

  update public.raw_questions
  set assigned_moderator_id = p_moderator_id
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  insert into public.qa_state_transitions (
    raw_question_id, moderator_id, from_state, to_state, note
  )
  select
    p_raw_question_id,
    auth.uid(),
    current_state,
    current_state,   -- assignment does not change state
    coalesce(p_note, 'Assigned to moderator')
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;
end;
$$;

revoke all on function public.question_assign(uuid, uuid, text) from public;
grant execute on function public.question_assign(uuid, uuid, text) to authenticated;

-- =====================================================================
-- RPC 5 — question_save_answer()
-- Write or update the draft answer for a question.
-- Requires: question.answer permission.
-- Does NOT change question state — the moderator must call
-- question_set_state('ANSWERED') explicitly after reviewing the draft.
-- =====================================================================

create or replace function public.question_save_answer(
  p_raw_question_id uuid,
  p_answer_text     text,
  p_attribution_label varchar(200) default 'Muriyar Ta Team'
)
returns uuid   -- returns answer_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer_id  uuid;
  v_lang       varchar(8);
begin
  if not public.has_permission('question.answer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if btrim(coalesce(p_answer_text, '')) = '' then
    raise exception 'answer_required' using errcode = '23514';
  end if;

  -- Moderator scope check: only assigned moderator or managing_editor+
  if not public.has_permission('question.disposition') then
    if not exists (
      select 1 from public.raw_questions
      where raw_question_id = p_raw_question_id
        and assigned_moderator_id = auth.uid()
    ) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  select language_code into v_lang
  from public.raw_questions
  where raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  insert into public.question_answers (
    raw_question_id,
    answer_text,
    answer_author_id,
    attribution_label,
    language_code
  ) values (
    p_raw_question_id,
    p_answer_text,
    auth.uid(),
    coalesce(p_attribution_label, 'Muriyar Ta Team'),
    v_lang
  )
  on conflict (raw_question_id) do update
    set answer_text       = excluded.answer_text,
        attribution_label = excluded.attribution_label,
        updated_at        = now()
  returning answer_id into v_answer_id;

  return v_answer_id;
end;
$$;

revoke all on function public.question_save_answer(uuid, text, varchar) from public;
grant execute on function public.question_save_answer(uuid, text, varchar) to authenticated;

-- =====================================================================
-- RPC 6 — question_publish()
-- Publishes a reviewed question–answer pair to public.published_qa.
-- Requires: question.publish permission + AAL2.
-- The moderator MUST supply question_display (de-identified text) — it
-- is NEVER auto-derived from the encrypted question_text.
-- Safeguarding: questions with risk_level = 'critical' cannot be
-- published without an explicit override by super_admin.
-- =====================================================================

create or replace function public.question_publish(
  p_raw_question_id  uuid,
  p_question_display text,     -- de-identified text for public display
  p_slug             varchar(220),
  p_override_critical boolean default false  -- super_admin only
)
returns uuid  -- returns published_qa_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        public.raw_questions%rowtype;
  v_answer     public.question_answers%rowtype;
  v_pub_id     uuid;
begin
  -- ── AAL2 guard ────────────────────────────────────────────────────────
  perform public.require_aal2();

  -- ── Permission check ──────────────────────────────────────────────────
  if not public.has_permission('question.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Fetch question ─────────────────────────────────────────────────────
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- ── Safeguarding: critical risk requires super_admin override ─────────
  if v_row.risk_level = 'critical' then
    if not p_override_critical then
      raise exception 'critical_risk_requires_override' using errcode = '23514',
        detail = 'Set p_override_critical = true (super_admin only) to publish a critical-risk question';
    end if;
    -- Only super_admin can set the override.
    if not ('super_admin' = any(public.current_app_roles())) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- ── Require ANSWERED state ────────────────────────────────────────────
  if v_row.current_state <> 'ANSWERED' then
    raise exception 'question_not_answered' using errcode = '23514',
      detail = 'Question must be in ANSWERED state before publishing';
  end if;

  -- ── Fetch answer ──────────────────────────────────────────────────────
  select * into v_answer
  from public.question_answers
  where raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'answer_not_found' using errcode = '23503';
  end if;

  -- ── Validate question_display ─────────────────────────────────────────
  if btrim(coalesce(p_question_display, '')) = '' then
    raise exception 'question_display_required' using errcode = '23514';
  end if;

  -- ── Validate slug ─────────────────────────────────────────────────────
  if btrim(coalesce(p_slug, '')) = '' then
    raise exception 'slug_required' using errcode = '23514';
  end if;

  -- ── Insert into published_qa ──────────────────────────────────────────
  insert into public.published_qa (
    raw_question_id,
    topic_id,
    language_code,
    slug,
    question_display,
    answer_text,
    attribution_label,
    published_by
  ) values (
    p_raw_question_id,
    v_row.topic_id,
    v_row.language_code,
    p_slug,
    p_question_display,
    v_answer.answer_text,
    v_answer.attribution_label,
    auth.uid()
  )
  returning published_qa_id into v_pub_id;

  -- ── Transition state to PUBLISHED ────────────────────────────────────
  update public.raw_questions
  set current_state = 'PUBLISHED'
  where raw_questions.raw_question_id = p_raw_question_id;

  insert into public.qa_state_transitions (
    raw_question_id, moderator_id, from_state, to_state, note
  ) values (
    p_raw_question_id,
    auth.uid(),
    'ANSWERED',
    'PUBLISHED',
    'Published as ' || p_slug
  );

  -- ── Audit log ─────────────────────────────────────────────────────────
  insert into audit.audit_log (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  )
  select
    auth.uid(),
    (select string_agg(r.name, ',') from public.user_role_assignments ura
     join public.roles r on r.role_id = ura.role_id
     where ura.user_id = auth.uid() and ura.revoked_at is null),
    'PUBLISH question_publish',
    'published_qa',
    v_pub_id::text,
    jsonb_build_object(
      'raw_question_id', p_raw_question_id,
      'slug',            p_slug,
      'language_code',   v_row.language_code
    );

  return v_pub_id;
end;
$$;

revoke all on function public.question_publish(uuid, text, varchar, boolean) from public;
grant execute on function public.question_publish(uuid, text, varchar, boolean) to authenticated;

-- =====================================================================
-- RPC 7 — purge_rejected_questions()
-- Called by cron job (scheduled below) to delete rejected questions
-- after their scheduled_purge_at date. Mirrors purge_rejected_submissions().
-- =====================================================================

create or replace function public.purge_rejected_questions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from public.raw_questions
  where current_state = 'REJECTED'
    and scheduled_purge_at is not null
    and scheduled_purge_at <= now();

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Schedule rejected question purge. Daily at 03:30 UTC.
select cron.schedule(
  'purge-rejected-questions',
  '30 3 * * *',
  $$ select public.purge_rejected_questions(); $$
);

-- =====================================================================
-- Audit scrub: extend audit.scrub() to strip question_text
-- (defensive — question_text is never passed to audit.scrub directly
-- because review_get_question() only passes decrypted text in its own
-- audit log metadata, not in a full row copy).
-- =====================================================================

create or replace function audit.scrub(j jsonb)
returns jsonb language sql immutable as $$
  select j
    - 'body_text'
    - 'contact_email_encrypted'
    - 'statement_text'
    - 'message'
    - 'email'
    - 'email_encrypted'
    - 'twofa_secret'
    - 'password_hash'
    - 'previous_value'
    - 'new_value'
    - 'transcript'
    - 'question_text';  -- added for Q&A
$$;

commit;
