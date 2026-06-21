-- =====================================================================
-- Migration 0014 — Moderation MVP RPCs
-- review_get_submission · review_set_disposition · review_add_note
-- SECURITY DEFINER (owned by postgres): bypass RLS but re-implement the same
-- access scope. Disposition relies on existing BEFORE-UPDATE triggers
-- (schedule_rejection_purge, set_resolved_at, set_updated_at) and never writes
-- resolved_at / scheduled_purge_at directly. Requires migration 0013 ('note').
-- =====================================================================

-- Queue index: pending/in-review submissions, oldest first.
create index if not exists rs_pending_queue_idx
  on public.raw_submissions (submission_timestamp)
  where current_state in ('PENDING', 'IN_REVIEW');


-- 1) review_get_submission(p_submission_id) — staff read, body DECRYPTED.
create or replace function public.review_get_submission(p_submission_id uuid)
returns table (
  submission_id          uuid,
  language_code          varchar,
  submission_timestamp   timestamptz,
  char_count             integer,
  current_state          varchar,
  issue_tag_id           integer,
  region_id              integer,
  assigned_moderator_id  uuid,
  consent_given          boolean,
  consent_version_id     integer,
  consent_timestamp      timestamptz,
  consent_language       varchar,
  rejection_reason_code  varchar,
  created_at             timestamptz,
  updated_at             timestamptz,
  resolved_at            timestamptz,
  body                   text
)
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  r      public.raw_submissions%rowtype;
  v_key  text;
  v_body text;
  v_role text := public.current_app_role();
  v_uid  uuid := auth.uid();
begin
  if not public.has_permission('submission.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into r
  from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Moderator scope (editors/admins unrestricted).
  if v_role = 'moderator'
     and not (r.current_state = 'PENDING' or r.assigned_moderator_id = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Resolve the Vault key (absent → fallback path).
  begin
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'story_body_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  -- Decrypt when a key is present; otherwise decode UTF-8. Robust to mixed data.
  if r.body_text is null then
    v_body := null;
  elsif v_key is not null then
    begin
      v_body := pgp_sym_decrypt(r.body_text, v_key);
    exception when others then
      begin
        v_body := convert_from(r.body_text, 'UTF8');
      exception when others then
        v_body := null;
      end;
    end;
  else
    begin
      v_body := convert_from(r.body_text, 'UTF8');
    exception when others then
      v_body := null;
    end;
  end if;

  return query select
    r.submission_id, r.language_code, r.submission_timestamp, r.char_count,
    r.current_state, r.issue_tag_id, r.region_id, r.assigned_moderator_id,
    r.consent_given, r.consent_version_id, r.consent_timestamp, r.consent_language,
    r.rejection_reason_code, r.created_at, r.updated_at, r.resolved_at, v_body;
end;
$$;


-- 2) review_set_disposition(p_submission_id, p_action, p_reason_code, p_note)
create or replace function public.review_set_disposition(
  p_submission_id uuid,
  p_action        text,
  p_reason_code   varchar default null,
  p_note          text    default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from     varchar;
  v_assigned uuid;
  v_to       varchar;
  v_role     text := public.current_app_role();
  v_uid      uuid := auth.uid();
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_permission('submission.disposition') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  -- Lock the row to serialize concurrent dispositions.
  select current_state, assigned_moderator_id
    into v_from, v_assigned
  from public.raw_submissions
  where submission_id = p_submission_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_from not in ('PENDING', 'IN_REVIEW') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  if v_role = 'moderator'
     and not (v_from = 'PENDING' or v_assigned = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_action = 'reject' then
    if p_reason_code is null
       or not exists (select 1 from public.rejection_reason_codes
                      where reason_code = p_reason_code) then
      raise exception 'reason_required' using errcode = '23503';
    end if;
    v_to := 'REJECTED';
  else
    v_to := 'APPROVED';
  end if;

  update public.raw_submissions
  set current_state          = v_to,
      assigned_moderator_id  = v_uid,
      rejection_reason_code  = case when p_action = 'reject'
                                    then p_reason_code
                                    else rejection_reason_code end
  where submission_id = p_submission_id;

  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, v_uid, p_action::moderation_action_type, v_from, v_to, v_note, false
  );

  return v_to;
end;
$$;


-- 3) review_add_note(p_submission_id, p_note)
create or replace function public.review_add_note(
  p_submission_id uuid,
  p_note          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state    varchar;
  v_assigned uuid;
  v_role     text := public.current_app_role();
  v_uid      uuid := auth.uid();
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_id       uuid;
begin
  if not public.has_permission('moderation.note') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'note_required' using errcode = '23514';
  end if;
  if char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  select current_state, assigned_moderator_id
    into v_state, v_assigned
  from public.raw_submissions
  where submission_id = p_submission_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_role = 'moderator'
     and not (v_state = 'PENDING' or v_assigned = v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, v_uid, 'note'::moderation_action_type, v_state, v_state, v_note, false
  )
  returning action_id into v_id;

  return v_id;
end;
$$;


-- Grants: staff are authenticated users. anon never calls these.
revoke all on function public.review_get_submission(uuid) from public;
revoke all on function public.review_set_disposition(uuid, text, varchar, text) from public;
revoke all on function public.review_add_note(uuid, text) from public;

grant execute on function public.review_get_submission(uuid) to authenticated;
grant execute on function public.review_set_disposition(uuid, text, varchar, text) to authenticated;
grant execute on function public.review_add_note(uuid, text) to authenticated;