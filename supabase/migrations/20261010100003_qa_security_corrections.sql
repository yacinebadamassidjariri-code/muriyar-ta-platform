-- =====================================================================
-- Ask Muriyar Ta — Migration 0004 — Security Corrections
-- Feature branch: feature/ask-muriyar-ta
-- Fixes issues in 20261010100001_qa_rpcs.sql:
--
--   1. Remove plaintext fallbacks in submit_question() and
--      review_get_question(). Missing or failing Vault key is now a
--      hard error, never a plaintext storage path.
--
--   2. Restore full audit.scrub() from 20260722050100_podcast_editorial_cms
--      (the canonical version before our migration ran) and add only the
--      Q&A-specific field (question_text). The previous version in
--      20261010100001 dropped several fields: 'body', 'country', 'region',
--      'contact_email', 'internal_notes'. This migration restores them.
--
-- Note: 20261010100001 was committed on feature/ask-muriyar-ta and has
-- not been applied to any database. The correction is applied here as a
-- separate migration so the history is explicit and auditable.
-- =====================================================================

begin;

-- =====================================================================
-- CORRECTION 1 — submit_question() without plaintext fallback
--
-- Previous behavior: if vault.decrypted_secrets had no 'question_body_key'
-- row, the body was stored as raw UTF-8 bytes. This is unsafe because:
--   a) the data reaches disk unencrypted in the WAL and heap pages
--   b) a missing key is likely a configuration error, not an intended state
--
-- New behavior: vault key absence raises 'encryption_key_unavailable'.
-- Vault access errors (permissions, extension not loaded) also raise the
-- same error. Callers receive a named error and the submission is not stored.
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
  begin
    v_ip_raw := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  exception when others then
    v_ip_raw := null;
  end;

  if v_ip_raw is not null then
    v_ip_hash := encode(digest(v_ip_raw, 'sha256'), 'hex');
    v_window  := date_trunc('hour', now());

    select coalesce(sum(count), 0)
      into v_count
      from public.qa_submission_cooldowns
     where ip_hash = v_ip_hash
       and window_start >= now() - interval '1 hour';

    if v_count >= 5 then
      raise exception 'rate_limit_exceeded' using errcode = '23514';
    end if;

    insert into public.qa_submission_cooldowns (ip_hash, window_start, count)
    values (v_ip_hash, v_window, 1)
    on conflict (ip_hash, window_start)
    do update set count = qa_submission_cooldowns.count + 1;
  end if;

  -- ── Vault key — REQUIRED, no fallback ───────────────────────────────
  -- A missing or inaccessible key is a configuration error.
  -- The question is NOT stored if encryption cannot be applied.
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'question_body_key'
    limit 1;
  exception when others then
    raise exception 'encryption_key_unavailable'
      using errcode = '58000',
            detail  = 'question_body_key could not be read from Vault';
  end;

  if v_key is null then
    raise exception 'encryption_key_unavailable'
      using errcode = '58000',
            detail  = 'question_body_key is not configured in Vault. '
                      'Run: select vault.create_secret(''<key>'', ''question_body_key'');';
  end if;

  -- ── Insert (encrypted only) ──────────────────────────────────────────
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
  ) values (
    pgp_sym_encrypt(p_question, v_key),
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
-- CORRECTION 2 — review_get_question() without plaintext fallback
--
-- Previous behavior: if vault key was absent, returned raw bytea bytes
-- decoded as UTF-8. This could silently return garbage bytes in
-- production and also created a path where the function appeared to
-- succeed when encryption was misconfigured.
--
-- New behavior: vault key absence raises 'encryption_key_unavailable'.
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
  -- ── AAL2 guard (first statement) ─────────────────────────────────────
  perform public.require_aal2();

  -- ── Permission check ──────────────────────────────────────────────────
  if not public.has_permission('question.raw.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- ── Fetch question ─────────────────────────────────────────────────────
  select * into v_row
  from public.raw_questions
  where raw_questions.raw_question_id = p_raw_question_id;

  if not found then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- ── Moderator scope check ──────────────────────────────────────────────
  if not public.has_permission('question.disposition') then
    if v_row.assigned_moderator_id is distinct from auth.uid()
       and v_row.current_state <> 'PENDING' then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  -- ── Vault key — REQUIRED, no fallback ─────────────────────────────────
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'question_body_key'
    limit 1;
  exception when others then
    raise exception 'encryption_key_unavailable'
      using errcode = '58000',
            detail  = 'question_body_key could not be read from Vault';
  end;

  if v_key is null then
    raise exception 'encryption_key_unavailable'
      using errcode = '58000',
            detail  = 'question_body_key is not configured in Vault';
  end if;

  -- ── Audit log ──────────────────────────────────────────────────────────
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

  -- ── Return decrypted row ───────────────────────────────────────────────
  return query
  select
    v_row.raw_question_id,
    pgp_sym_decrypt(v_row.question_text, v_key)  as question_text_plain,
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
-- CORRECTION 3 — Restore full audit.scrub() with Q&A field added
--
-- The version in 20261010100001_qa_rpcs.sql dropped fields that were
-- present in 20260722050100_podcast_editorial_cms.sql (the canonical
-- version): 'body', 'country', 'region', 'contact_email', 'internal_notes'.
--
-- This migration restores the full set from that canonical version and
-- appends 'question_text' as the only Q&A addition.
-- =====================================================================

create or replace function audit.scrub(j jsonb)
returns jsonb language sql immutable as $$
  select coalesce(j, '{}'::jsonb)
    -- submission content (story + Q&A)
    - 'body_text'
    - 'body'
    - 'question_text'
    -- geographic context
    - 'country'
    - 'region'
    -- contact / identity
    - 'contact_email_encrypted'
    - 'contact_email'
    - 'email'
    -- consent / legal text
    - 'statement_text'
    -- freeform text fields
    - 'message'
    - 'note'
    - 'internal_notes'
    -- credentials / secrets
    - 'twofa_secret'
    - 'password_hash'
    - 'access_token'
    - 'refresh_token'
    -- storage paths / URLs
    - 'signed_url'
    - 'signedUrl'
    - 'storage_path'
    -- audit / edit history
    - 'previous_value'
    - 'new_value'
    - 'transcript'
    - 'raw_sql_error';
$$;

commit;
