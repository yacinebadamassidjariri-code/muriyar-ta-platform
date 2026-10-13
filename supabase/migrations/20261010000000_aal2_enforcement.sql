-- AAL2 enforcement for sensitive administrative RPCs.
--
-- This migration adds a require_aal2() helper and re-applies every sensitive
-- SECURITY DEFINER function with an AAL2 guard as its first executable
-- statement. The check is performed inside the database so that direct
-- PostgREST calls with an AAL1 JWT are also rejected.
--
-- Functions that only aggregate counts or return queue metadata (dashboard,
-- queue, moderators) are intentionally excluded — they expose no raw story
-- content. The auth.jwt() path means that a service_role / SQL Editor
-- connection (where auth.jwt() returns null) is treated as AAL1 and is
-- therefore blocked from content-decrypting paths.
--
-- Apply only in development until the founder has enrolled TOTP through
-- the /mfa page and confirmed an AAL2 session. See MIGRATIONS.md for the
-- production rollout checklist.
--
-- Idempotent: all statements use CREATE OR REPLACE. The single exception is
-- review_get_submission, whose return type was already narrowed by migration
-- 20260719033000 — that migration already used DROP + CREATE, so this one
-- can safely use CREATE OR REPLACE.

begin;

-- ---------------------------------------------------------------------------
-- Helper: require_aal2()
-- Raises aal2_required (SQLSTATE 42501) when the current JWT is not AAL2.
-- auth.jwt() returns null outside a real user session (service_role, SQL
-- editor, etc.) which is treated as AAL < 2 — deliberately fail-closed.
-- ---------------------------------------------------------------------------
create or replace function public.require_aal2()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'aal2_required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_aal2() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- review_get_submission — decrypts raw story body
-- (DROP + CREATE already used in 20260719033000; safe to CREATE OR REPLACE
-- because the return shape is unchanged here)
-- ---------------------------------------------------------------------------
create or replace function public.review_get_submission(p_submission_id uuid)
returns table (
  submission_id uuid,
  language_code varchar,
  submission_timestamp timestamptz,
  char_count integer,
  current_state varchar,
  issue_tag_id integer,
  assigned_moderator_id uuid,
  consent_given boolean,
  consent_version_id integer,
  consent_timestamp timestamptz,
  consent_language varchar,
  rejection_reason_code varchar,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  body text
)
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype;
begin
  perform public.require_aal2();
  if not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into r from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event('submission.raw.read', 'submission', p_submission_id::text, '{}'::jsonb);
  return query select
    r.submission_id, r.language_code, r.submission_timestamp, r.char_count,
    r.current_state, r.issue_tag_id, r.assigned_moderator_id,
    r.consent_given, r.consent_version_id, r.consent_timestamp,
    r.consent_language, r.rejection_reason_code, r.created_at, r.updated_at,
    r.resolved_at, public._decrypt_submission_body(r.body_text);
end;
$$;

-- ---------------------------------------------------------------------------
-- review_get_submission_location — returns geographic data
-- ---------------------------------------------------------------------------
create or replace function public.review_get_submission_location(
  p_submission_id uuid,
  p_access_reason text
)
returns table (country text, region text, region_id integer)
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  perform public.require_aal2();
  if not public.has_permission('submission.location.read')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_access_reason is null or p_access_reason !~ '^[a-z][a-z0-9_]{2,39}$' then
    raise exception 'invalid_access_reason' using errcode = '22023';
  end if;
  perform audit.write_event(
    'submission.location.read', 'submission', p_submission_id::text,
    jsonb_build_object('reason_code', p_access_reason)
  );
  return query select r.country, r.region, r.region_id
  from public.raw_submissions r where r.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- review_get_submission_break_glass — decrypts raw body, unrestricted access
-- ---------------------------------------------------------------------------
create or replace function public.review_get_submission_break_glass(
  p_submission_id uuid,
  p_reason_code text
)
returns table (
  submission_id uuid,
  language_code varchar,
  submission_timestamp timestamptz,
  char_count integer,
  current_state varchar,
  issue_tag_id integer,
  assigned_moderator_id uuid,
  consent_given boolean,
  consent_version_id integer,
  consent_timestamp timestamptz,
  consent_language varchar,
  rejection_reason_code varchar,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  body text
)
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype;
begin
  perform public.require_aal2();
  if not public.is_admin() or not public.has_permission('submission.raw.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code !~ '^break_glass_[a-z0-9_]{3,28}$' then
    raise exception 'invalid_access_reason' using errcode = '22023';
  end if;
  select * into r from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event(
    'submission.raw.break_glass', 'submission', p_submission_id::text,
    jsonb_build_object('reason_code', p_reason_code)
  );
  return query select
    r.submission_id, r.language_code, r.submission_timestamp, r.char_count,
    r.current_state, r.issue_tag_id, r.assigned_moderator_id,
    r.consent_given, r.consent_version_id, r.consent_timestamp,
    r.consent_language, r.rejection_reason_code, r.created_at, r.updated_at,
    r.resolved_at, public._decrypt_submission_body(r.body_text);
end;
$$;

-- ---------------------------------------------------------------------------
-- review_set_disposition — approve or reject a submission
-- ---------------------------------------------------------------------------
create or replace function public.review_set_disposition(
  p_submission_id uuid,
  p_action text,
  p_reason_code varchar default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from varchar;
  v_to varchar;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform public.require_aal2();
  if not public.has_permission('submission.disposition')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;
  select current_state into v_from from public.raw_submissions
  where submission_id = p_submission_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_from not in ('PENDING', 'IN_REVIEW') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_action = 'reject' then
    if p_reason_code is null or not exists (
      select 1 from public.rejection_reason_codes where reason_code = p_reason_code
    ) then raise exception 'reason_required' using errcode = '23503'; end if;
    v_to := 'REJECTED';
  else
    v_to := 'APPROVED';
  end if;
  update public.raw_submissions
  set current_state = v_to,
      rejection_reason_code = case when p_action = 'reject'
        then p_reason_code else null end
  where submission_id = p_submission_id;
  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, auth.uid(), p_action::public.moderation_action_type,
    v_from, v_to, v_note, false
  );
  return v_to;
end;
$$;

-- ---------------------------------------------------------------------------
-- review_add_note — adds a moderation note to a submission
-- ---------------------------------------------------------------------------
create or replace function public.review_add_note(
  p_submission_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state varchar;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  perform public.require_aal2();
  if not public.has_permission('submission.review')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null then raise exception 'note_required' using errcode = '23514'; end if;
  if char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;
  select current_state into v_state from public.raw_submissions
  where submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, auth.uid(), 'note'::public.moderation_action_type,
    v_state, v_state, v_note, false
  ) returning action_id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- assign_user_role — assigns a canonical role to a staff user
-- ---------------------------------------------------------------------------
create or replace function public.assign_user_role(
  p_user_id uuid,
  p_role_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_role_id integer; v_assignment_id uuid;
begin
  perform public.require_aal2();
  if not public.has_permission('role.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select role_id into v_role_id from public.roles
  where name = p_role_name
    and name in ('super_admin','managing_editor','moderator','resource_editor','translator','researcher');
  if v_role_id is null or not exists (select 1 from public.users where user_id = p_user_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.user_role_assignments(user_id, role_id, assigned_by)
  values (p_user_id, v_role_id, auth.uid())
  on conflict (user_id, role_id) where revoked_at is null
  do update set assigned_by = excluded.assigned_by
  returning assignment_id into v_assignment_id;
  return v_assignment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- revoke_user_role — revokes a role assignment
-- ---------------------------------------------------------------------------
create or replace function public.revoke_user_role(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  perform public.require_aal2();
  if not public.has_permission('role.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.user_role_assignments
  set revoked_at = now()
  where assignment_id = p_assignment_id and revoked_at is null;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_workspace — decrypts raw body + returns location conditionally
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_workspace(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype; v_body text; v_result jsonb;
begin
  perform public.require_aal2();
  if not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into r from public.raw_submissions where submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_body := public._decrypt_submission_body(r.body_text);
  perform audit.write_event('submission.raw.read', 'submission', p_submission_id::text, '{}'::jsonb);
  select jsonb_build_object(
    'submission', jsonb_build_object(
      'submissionId', r.submission_id,
      'languageCode', r.language_code,
      'submittedAt', r.submission_timestamp,
      'charCount', r.char_count,
      'status', r.current_state,
      'assignedModeratorId', r.assigned_moderator_id,
      'country', case when public.has_permission('submission.location.read') then r.country else null end,
      'region', case when public.has_permission('submission.location.read') then r.region else null end,
      'body', v_body,
      'rejectionReasonCode', r.rejection_reason_code,
      'isEscalated', r.is_escalated
    ),
    'review', jsonb_build_object(
      'riskLevel', coalesce(m.risk_level, 'none'),
      'riskFlags', coalesce(to_jsonb(m.risk_flags), '[]'::jsonb)
    ),
    'draft', jsonb_build_object(
      'title', coalesce(d.title, ''),
      'body', coalesce(d.body_text, v_body, ''),
      'excerpt', coalesce(d.excerpt, ''),
      'featuredQuote', coalesce(d.featured_quote, ''),
      'categoryTagId', d.category_tag_id,
      'tagIds', coalesce(to_jsonb(d.tag_ids), '[]'::jsonb),
      'relatedPodcastIds', coalesce(to_jsonb(d.related_podcast_ids), '[]'::jsonb),
      'relatedReportIds', coalesce(to_jsonb(d.related_report_ids), '[]'::jsonb)
    ),
    'publicStory', case when s.story_id is null then null else jsonb_build_object(
      'storyId', s.story_id, 'slug', s.slug, 'status', s.status,
      'publishedAt', s.published_at, 'unpublishedAt', s.unpublished_at,
      'archivedAt', s.archived_at
    ) end,
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'actionId', a.action_id, 'action', a.action_type,
        'fromState', a.from_state, 'toState', a.to_state,
        'note', a.note, 'createdAt', a.created_at,
        'actor', coalesce(au.display_name, 'Staff member')
      ) order by a.created_at desc)
      from public.moderation_actions a
      left join public.users au on au.user_id = a.moderator_id
      where a.submission_id = r.submission_id
    ), '[]'::jsonb)
  ) into v_result
  from public.submission_review_metadata m
  full join public.story_editorial_drafts d on d.submission_id = m.submission_id
  full join public.published_stories s on s.source_submission_ref = coalesce(m.submission_id, d.submission_id)
  where coalesce(m.submission_id, d.submission_id, s.source_submission_ref) = r.submission_id;

  if v_result is null then
    v_result := jsonb_build_object(
      'submission', jsonb_build_object(
        'submissionId', r.submission_id, 'languageCode', r.language_code,
        'submittedAt', r.submission_timestamp, 'charCount', r.char_count,
        'status', r.current_state, 'assignedModeratorId', r.assigned_moderator_id,
        'country', case when public.has_permission('submission.location.read') then r.country else null end,
        'region', case when public.has_permission('submission.location.read') then r.region else null end,
        'body', v_body, 'rejectionReasonCode', r.rejection_reason_code,
        'isEscalated', r.is_escalated
      ),
      'review', jsonb_build_object('riskLevel','none','riskFlags','[]'::jsonb),
      'draft', jsonb_build_object('title','','body',coalesce(v_body,''),'excerpt','','featuredQuote','',
        'categoryTagId',null,'tagIds','[]'::jsonb,'relatedPodcastIds','[]'::jsonb,'relatedReportIds','[]'::jsonb),
      'publicStory', null,
      'history', coalesce((select jsonb_agg(jsonb_build_object(
        'actionId', a.action_id, 'action', a.action_type, 'fromState', a.from_state,
        'toState', a.to_state, 'note', a.note, 'createdAt', a.created_at,
        'actor', coalesce(au.display_name,'Staff member')) order by a.created_at desc)
        from public.moderation_actions a left join public.users au on au.user_id = a.moderator_id
        where a.submission_id = r.submission_id), '[]'::jsonb)
    );
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_assign — assigns or releases a moderator on a submission
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_assign(
  p_submission_id uuid,
  p_assignee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_before jsonb; v_after jsonb; v_current uuid; v_state varchar; v_operation text;
begin
  perform public.require_aal2();
  if not public.has_permission('submission.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select assigned_moderator_id, current_state into v_current, v_state
  from public.raw_submissions where submission_id = p_submission_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_state in ('PUBLISHED','REJECTED','ARCHIVED') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_assignee_id is distinct from auth.uid() and not public.has_permission('submission.assign') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.has_permission('submission.assign') and v_current is not null
     and v_current is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_assignee_id is null and v_current is distinct from auth.uid()
     and not public.has_permission('submission.assign') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_assignee_id is not null and not exists (
    select 1 from public.users u where u.user_id = p_assignee_id and u.is_active
      and exists (
        select 1 from public.user_role_assignments ura
        join public.role_permissions rp on rp.role_id = ura.role_id
        join public.permissions p on p.permission_id = rp.permission_id
        where ura.user_id = u.user_id and ura.revoked_at is null and p.code = 'submission.review'
      )
  ) then raise exception 'invalid_input' using errcode = '22023'; end if;
  v_before := public.story_admin_snapshot(p_submission_id);
  update public.raw_submissions set
    assigned_moderator_id = p_assignee_id,
    current_state = case
      when p_assignee_id is not null and current_state = 'PENDING' then 'IN_REVIEW'
      else current_state end
  where submission_id = p_submission_id;
  v_operation := case
    when p_assignee_id is null then 'release'
    when v_current is null then 'assign'
    when v_current = p_assignee_id then 'assign'
    else 'reassign' end;
  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (p_submission_id, auth.uid(), 'assign', v_state,
    case when p_assignee_id is not null and v_state = 'PENDING' then 'IN_REVIEW' else v_state end,
    v_operation, false);
  v_after := public.story_admin_snapshot(p_submission_id);
  perform public.story_admin_write_revision(p_submission_id, v_operation, v_before, v_after);
  return jsonb_build_object('status', v_after->>'state', 'assigneeId', p_assignee_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_save_review — records risk level and flags
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_save_review(
  p_submission_id uuid,
  p_risk_level text,
  p_risk_flags text[],
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_before jsonb; v_after jsonb; v_state varchar; v_note text := nullif(btrim(coalesce(p_note,'')), '');
begin
  perform public.require_aal2();
  if not public.has_permission('submission.review') or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_risk_level not in ('none','low','medium','high','critical')
     or cardinality(coalesce(p_risk_flags,array[]::text[])) > 20
     or exists (select 1 from unnest(coalesce(p_risk_flags,array[]::text[])) flag where flag !~ '^[a-z][a-z0-9_]{1,39}$')
     or (v_note is not null and char_length(v_note) > 2000) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select current_state into v_state from public.raw_submissions where submission_id = p_submission_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_before := public.story_admin_snapshot(p_submission_id);
  insert into public.submission_review_metadata(submission_id,risk_level,risk_flags,updated_by)
  values (p_submission_id,p_risk_level,array(select distinct value from unnest(coalesce(p_risk_flags,array[]::text[])) value order by value),auth.uid())
  on conflict (submission_id) do update set risk_level=excluded.risk_level,
    risk_flags=excluded.risk_flags,updated_by=auth.uid(),updated_at=now();
  if 'requires_escalation' = any(coalesce(p_risk_flags,array[]::text[])) then
    update public.raw_submissions set is_escalated=true,escalated_at=coalesce(escalated_at,now()),escalated_by=auth.uid()
    where submission_id=p_submission_id;
  end if;
  if v_note is not null then
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
    values (p_submission_id,auth.uid(),'note',v_state,v_state,v_note,p_risk_level in ('high','critical'));
  end if;
  v_after := public.story_admin_snapshot(p_submission_id);
  perform public.story_admin_write_revision(p_submission_id,'review',v_before,v_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_save_draft — writes editorial draft (title, body, tags, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_save_draft(p_submission_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_before jsonb; v_after jsonb; v_title text; v_body text; v_excerpt text; v_quote text;
  v_category integer; v_tags integer[]; v_podcasts uuid[]; v_reports uuid[];
begin
  perform public.require_aal2();
  if not public.has_permission('story.edit') or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  v_title := nullif(btrim(p_payload->>'title'),'');
  v_body := nullif(btrim(p_payload->>'body'),'');
  v_excerpt := nullif(btrim(p_payload->>'excerpt'),'');
  v_quote := nullif(btrim(p_payload->>'featured_quote'),'');
  v_category := nullif(p_payload->>'category_tag_id','')::integer;
  select coalesce(array_agg(distinct value::integer order by value::integer),array[]::integer[])
    into v_tags from jsonb_array_elements_text(coalesce(p_payload->'tag_ids','[]'::jsonb));
  select coalesce(array_agg(distinct value::uuid order by value::uuid),array[]::uuid[])
    into v_podcasts from jsonb_array_elements_text(coalesce(p_payload->'related_podcast_ids','[]'::jsonb));
  select coalesce(array_agg(distinct value::uuid order by value::uuid),array[]::uuid[])
    into v_reports from jsonb_array_elements_text(coalesce(p_payload->'related_report_ids','[]'::jsonb));
  if (v_title is not null and char_length(v_title)>200)
     or (v_body is not null and char_length(v_body)>100000)
     or (v_excerpt is not null and char_length(v_excerpt)>500)
     or (v_quote is not null and char_length(v_quote)>500)
     or cardinality(v_tags)>30 or cardinality(v_podcasts)>30 or cardinality(v_reports)>30
     or (v_category is not null and not exists(select 1 from public.issue_tags where tag_id=v_category))
     or (select count(*) from public.issue_tags where tag_id=any(v_tags))<>cardinality(v_tags)
     or (select count(*) from public.podcast_episodes where episode_id=any(v_podcasts))<>cardinality(v_podcasts)
     or (select count(*) from public.reports where report_id=any(v_reports))<>cardinality(v_reports) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  perform 1 from public.raw_submissions where submission_id=p_submission_id for update;
  if not found then raise exception 'not_found' using errcode='P0002'; end if;
  v_before := public.story_admin_snapshot(p_submission_id);
  insert into public.story_editorial_drafts(
    submission_id,title,body_text,excerpt,featured_quote,category_tag_id,tag_ids,
    related_podcast_ids,related_report_ids,updated_by
  ) values (p_submission_id,v_title,v_body,v_excerpt,v_quote,v_category,v_tags,v_podcasts,v_reports,auth.uid())
  on conflict (submission_id) do update set title=excluded.title,body_text=excluded.body_text,
    excerpt=excluded.excerpt,featured_quote=excluded.featured_quote,category_tag_id=excluded.category_tag_id,
    tag_ids=excluded.tag_ids,related_podcast_ids=excluded.related_podcast_ids,
    related_report_ids=excluded.related_report_ids,updated_by=auth.uid(),updated_at=now();
  v_after := public.story_admin_snapshot(p_submission_id);
  perform public.story_admin_write_revision(p_submission_id,'save_draft',v_before,v_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_transition — approve/reject/publish/unpublish/archive/restore
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_transition(
  p_submission_id uuid,
  p_action text,
  p_reason_code text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  r public.raw_submissions%rowtype; d public.story_editorial_drafts%rowtype;
  s public.published_stories%rowtype; v_before jsonb; v_after jsonb;
  v_note text:=nullif(btrim(coalesce(p_note,'')),''); v_to text; v_story_id uuid; v_slug text; v_base text; v_n int:=1;
begin
  perform public.require_aal2();
  if p_action in ('approve','reject') then
    if not public.has_permission('submission.disposition') then raise exception 'forbidden' using errcode='42501'; end if;
  elsif p_action in ('publish','unpublish','archive','restore') then
    if not public.has_permission('story.publish') then raise exception 'forbidden' using errcode='42501'; end if;
  else raise exception 'invalid_input' using errcode='22023'; end if;
  if not public.can_access_submission(p_submission_id) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into r from public.raw_submissions where submission_id=p_submission_id for update;
  if not found then raise exception 'not_found' using errcode='P0002'; end if;
  if v_note is not null and char_length(v_note)>2000 then raise exception 'invalid_input' using errcode='22023'; end if;
  v_before := public.story_admin_snapshot(p_submission_id);

  if p_action='approve' then
    if r.current_state not in ('PENDING','IN_REVIEW','NEEDS_EDIT') then raise exception 'invalid_transition' using errcode='22023'; end if;
    v_to:='APPROVED';
    update public.raw_submissions set current_state=v_to,rejection_reason_code=null where submission_id=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'approve',r.current_state,v_to,v_note,false);
  elsif p_action='reject' then
    if r.current_state not in ('PENDING','IN_REVIEW','NEEDS_EDIT','APPROVED')
       or not exists(select 1 from public.rejection_reason_codes where reason_code=p_reason_code) then
      raise exception 'invalid_transition' using errcode='22023';
    end if;
    v_to:='REJECTED';
    update public.raw_submissions set current_state=v_to,rejection_reason_code=p_reason_code where submission_id=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'reject',r.current_state,v_to,v_note,false);
  elsif p_action='publish' then
    if r.current_state<>'APPROVED' then raise exception 'invalid_transition' using errcode='22023'; end if;
    select * into d from public.story_editorial_drafts where submission_id=p_submission_id;
    if not found or nullif(btrim(coalesce(d.title,'')),'') is null or char_length(btrim(coalesce(d.body_text,'')))<50 then
      raise exception 'invalid_input' using errcode='22023';
    end if;
    select * into s from public.published_stories where source_submission_ref=p_submission_id for update;
    if found then
      v_story_id:=s.story_id;
      update public.published_stories set title=d.title,body_text=d.body_text,excerpt=d.excerpt,
        featured_quote=d.featured_quote,category_tag_id=d.category_tag_id,status='published',
        published_at=now(),published_by=auth.uid(),unpublished_at=null,archived_at=null
      where story_id=v_story_id;
    else
      v_base:=coalesce(nullif(public.slugify(d.title),''),left(replace(gen_random_uuid()::text,'-',''),12));
      v_slug:=v_base;
      while exists(select 1 from public.published_stories where slug=v_slug) loop
        v_n:=v_n+1; v_slug:=left(v_base,210)||'-'||v_n::text;
      end loop;
      insert into public.published_stories(source_submission_ref,title,slug,body_text,language_code,region_id,
        excerpt,featured_quote,category_tag_id,status,published_at,published_by)
      values(p_submission_id,d.title,v_slug,d.body_text,r.language_code,r.region_id,d.excerpt,d.featured_quote,
        d.category_tag_id,'published',now(),auth.uid()) returning story_id into v_story_id;
    end if;
    delete from public.published_story_tags where story_id=v_story_id;
    insert into public.published_story_tags(story_id,tag_id) select v_story_id,unnest(d.tag_ids) on conflict do nothing;
    delete from public.podcast_episode_stories where story_id=v_story_id;
    insert into public.podcast_episode_stories(episode_id,story_id) select unnest(d.related_podcast_ids),v_story_id on conflict do nothing;
    delete from public.published_story_reports where story_id=v_story_id;
    insert into public.published_story_reports(story_id,report_id) select v_story_id,unnest(d.related_report_ids) on conflict do nothing;
    v_to:='PUBLISHED';
    update public.raw_submissions set current_state=v_to where submission_id=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'publish',r.current_state,v_to,v_note,false);
  elsif p_action='unpublish' then
    if r.current_state<>'PUBLISHED' then raise exception 'invalid_transition' using errcode='22023'; end if;
    update public.published_stories set status='draft',unpublished_at=now() where source_submission_ref=p_submission_id;
    v_to:='APPROVED'; update public.raw_submissions set current_state=v_to where submission_id=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'deidentify_edit',r.current_state,v_to,coalesce(v_note,'Unpublished'),false);
  elsif p_action='archive' then
    if r.current_state='ARCHIVED' then raise exception 'already' using errcode='22023'; end if;
    insert into public.submission_review_metadata(submission_id,archived_from_state,updated_by)
      values(p_submission_id,r.current_state,auth.uid()) on conflict(submission_id) do update set
      archived_from_state=excluded.archived_from_state,updated_by=auth.uid(),updated_at=now();
    update public.published_stories set status='archived',archived_at=now() where source_submission_ref=p_submission_id;
    v_to:='ARCHIVED'; update public.raw_submissions set current_state=v_to where submission_id=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'archive',r.current_state,v_to,v_note,false);
  else
    if r.current_state<>'ARCHIVED' then raise exception 'invalid_transition' using errcode='22023'; end if;
    select archived_from_state into v_to from public.submission_review_metadata where submission_id=p_submission_id;
    if v_to in ('PUBLISHED','ARCHIVED','REJECTED') or v_to is null then v_to:='APPROVED'; end if;
    update public.raw_submissions set current_state=v_to where submission_id=p_submission_id;
    update public.published_stories set status='draft',archived_at=null where source_submission_ref=p_submission_id;
    insert into public.moderation_actions(submission_id,moderator_id,action_type,from_state,to_state,note,is_crisis_flag)
      values(p_submission_id,auth.uid(),'deidentify_edit',r.current_state,v_to,coalesce(v_note,'Restored'),false);
  end if;
  v_after:=public.story_admin_snapshot(p_submission_id);
  perform public.story_admin_write_revision(p_submission_id,p_action,v_before,v_after,
    jsonb_build_object('reason_code',p_reason_code));
  return jsonb_build_object('status',v_to,'storyId',v_story_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- story_admin_bulk — processes bulk operations; internally calls assign/transition
-- (Those inner calls will also check AAL2 because they now have the guard too.)
-- ---------------------------------------------------------------------------
create or replace function public.story_admin_bulk(
  p_submission_ids uuid[],
  p_action text,
  p_assignee_id uuid default null,
  p_reason_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_id uuid; v_state text; v_assignee uuid; v_updated int:=0; v_skipped int:=0; v_already int:=0; v_batch uuid:=gen_random_uuid();
begin
  perform public.require_aal2();
  if cardinality(coalesce(p_submission_ids,array[]::uuid[]))=0 or cardinality(p_submission_ids)>100
     or p_action not in ('approve','reject','publish','unpublish','archive','restore','assign','reassign','release') then
    raise exception 'invalid_input' using errcode='22023';
  end if;
  foreach v_id in array p_submission_ids loop
    select current_state,assigned_moderator_id into v_state,v_assignee from public.raw_submissions where submission_id=v_id;
    if not found then v_skipped:=v_skipped+1; continue; end if;
    begin
      if p_action in ('assign','reassign') then
        if v_assignee=p_assignee_id then v_already:=v_already+1;
        else perform public.story_admin_assign(v_id,p_assignee_id); v_updated:=v_updated+1; end if;
      elsif p_action='release' then
        if v_assignee is null then v_already:=v_already+1;
        else perform public.story_admin_assign(v_id,null); v_updated:=v_updated+1; end if;
      elsif (p_action='approve' and v_state='APPROVED') or (p_action='reject' and v_state='REJECTED')
         or (p_action='publish' and v_state='PUBLISHED') or (p_action='archive' and v_state='ARCHIVED') then
        v_already:=v_already+1;
      else
        perform public.story_admin_transition(v_id,p_action,p_reason_code,null); v_updated:=v_updated+1;
      end if;
    exception when others then
      if sqlerrm in ('forbidden','invalid_input','aal2_required') then raise; end if;
      v_skipped:=v_skipped+1;
    end;
  end loop;
  perform audit.write_event('story.bulk.summary','submission_batch',v_batch::text,jsonb_build_object(
    'action',p_action,'requested',cardinality(p_submission_ids),'updated',v_updated,'skipped',v_skipped,'already',v_already));
  return jsonb_build_object('requested',cardinality(p_submission_ids),'updated',v_updated,'skipped',v_skipped,'already',v_already);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: preserve existing access; require_aal2 is internal only
-- ---------------------------------------------------------------------------

revoke all on function public.review_get_submission(uuid),
  public.review_get_submission_location(uuid, text),
  public.review_get_submission_break_glass(uuid, text) from public;
grant execute on function public.review_get_submission(uuid),
  public.review_get_submission_location(uuid, text),
  public.review_get_submission_break_glass(uuid, text) to authenticated;

revoke all on function public.review_set_disposition(uuid, text, varchar, text),
  public.review_add_note(uuid, text) from public;
grant execute on function public.review_set_disposition(uuid, text, varchar, text),
  public.review_add_note(uuid, text) to authenticated;

revoke all on function public.assign_user_role(uuid, text) from public;
revoke all on function public.revoke_user_role(uuid) from public;
grant execute on function public.assign_user_role(uuid, text),
  public.revoke_user_role(uuid) to authenticated;

revoke all on function public.story_admin_workspace(uuid),
  public.story_admin_assign(uuid,uuid),
  public.story_admin_save_review(uuid,text,text[],text),
  public.story_admin_save_draft(uuid,jsonb),
  public.story_admin_transition(uuid,text,text,text),
  public.story_admin_bulk(uuid[],text,uuid,text)
from public, anon, authenticated;

grant execute on function public.story_admin_workspace(uuid),
  public.story_admin_assign(uuid,uuid),
  public.story_admin_save_review(uuid,text,text[],text),
  public.story_admin_save_draft(uuid,jsonb),
  public.story_admin_transition(uuid,text,text,text),
  public.story_admin_bulk(uuid[],text,uuid,text)
to authenticated;

commit;
