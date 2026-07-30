-- M-47 — Story moderation and publishing CMS.
-- Raw contributor content stays immutable and private. Authenticated clients use
-- the narrow capability-checked RPCs below; public story views are unchanged.

begin;

create table public.submission_review_metadata (
  submission_id uuid primary key references public.raw_submissions(submission_id) on delete cascade,
  risk_level text not null default 'none'
    check (risk_level in ('none','low','medium','high','critical')),
  risk_flags text[] not null default array[]::text[],
  archived_from_state varchar(20) references public.moderation_states(state_code),
  updated_by uuid references public.users(user_id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint submission_review_risk_flags check (cardinality(risk_flags) <= 20)
);

create table public.story_editorial_drafts (
  submission_id uuid primary key references public.raw_submissions(submission_id) on delete cascade,
  title varchar(200),
  body_text text,
  excerpt varchar(500),
  featured_quote varchar(500),
  category_tag_id integer references public.issue_tags(tag_id) on delete set null,
  tag_ids integer[] not null default array[]::integer[],
  related_podcast_ids uuid[] not null default array[]::uuid[],
  related_report_ids uuid[] not null default array[]::uuid[],
  updated_by uuid references public.users(user_id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint story_editorial_tag_limit check (cardinality(tag_ids) <= 30),
  constraint story_editorial_podcast_limit check (cardinality(related_podcast_ids) <= 30),
  constraint story_editorial_report_limit check (cardinality(related_report_ids) <= 30)
);

alter table public.published_stories
  add column if not exists excerpt varchar(500),
  add column if not exists featured_quote varchar(500),
  add column if not exists category_tag_id integer references public.issue_tags(tag_id) on delete set null,
  add column if not exists unpublished_at timestamptz,
  add column if not exists archived_at timestamptz;

create table public.published_story_reports (
  story_id uuid not null references public.published_stories(story_id) on delete cascade,
  report_id uuid not null references public.reports(report_id) on delete cascade,
  primary key (story_id, report_id)
);

create index submission_review_risk_idx
  on public.submission_review_metadata(risk_level, updated_at desc);
create index story_drafts_updated_idx
  on public.story_editorial_drafts(updated_at desc, submission_id);
create index raw_submissions_admin_queue_idx
  on public.raw_submissions(current_state, submission_timestamp desc, submission_id);

alter table public.submission_review_metadata enable row level security;
alter table public.story_editorial_drafts enable row level security;
alter table public.published_story_reports enable row level security;

revoke all on public.submission_review_metadata from anon, authenticated;
revoke all on public.story_editorial_drafts from anon, authenticated;
revoke all on public.published_story_reports from anon, authenticated;

-- Managing editors and super administrators may review any submission. A
-- moderator remains scoped to work assigned to them or explicitly escalated.
create or replace function public.can_access_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.raw_submissions r
    where r.submission_id = p_submission_id
      and public.has_permission('submission.raw.read')
      and (
        public.has_permission('submission.assign')
        or r.assigned_moderator_id = auth.uid()
      )
  );
$$;

create or replace function public.story_admin_snapshot(p_submission_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'state', r.current_state,
    'assigned_moderator_id', r.assigned_moderator_id,
    'rejection_reason_code', r.rejection_reason_code,
    'is_escalated', r.is_escalated,
    'risk_level', coalesce(m.risk_level, 'none'),
    'risk_flags', coalesce(to_jsonb(m.risk_flags), '[]'::jsonb),
    'title', d.title,
    'body_text', case when d.body_text is null then null else '[redacted]' end,
    'excerpt', d.excerpt,
    'featured_quote', d.featured_quote,
    'category_tag_id', d.category_tag_id,
    'tag_ids', coalesce(to_jsonb(d.tag_ids), '[]'::jsonb),
    'related_podcast_ids', coalesce(to_jsonb(d.related_podcast_ids), '[]'::jsonb),
    'related_report_ids', coalesce(to_jsonb(d.related_report_ids), '[]'::jsonb),
    'public_status', s.status,
    'story_id', s.story_id
  )
  from public.raw_submissions r
  left join public.submission_review_metadata m using (submission_id)
  left join public.story_editorial_drafts d using (submission_id)
  left join public.published_stories s on s.source_submission_ref = r.submission_id
  where r.submission_id = p_submission_id;
$$;

create or replace function public.story_admin_changes(p_before jsonb, p_after jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare v_key text; v_changes jsonb := '{}'::jsonb;
begin
  p_before := coalesce(p_before, '{}'::jsonb);
  p_after := coalesce(p_after, '{}'::jsonb);
  for v_key in
    select key from (
      select jsonb_object_keys(p_before) key
      union select jsonb_object_keys(p_after) key
    ) keys order by key
  loop
    if p_before->v_key is distinct from p_after->v_key then
      v_changes := v_changes || jsonb_build_object(
        v_key, jsonb_build_object(
          'before', coalesce(p_before->v_key, 'null'::jsonb),
          'after', coalesce(p_after->v_key, 'null'::jsonb)
        )
      );
    end if;
  end loop;
  return v_changes;
end;
$$;

create or replace function public.story_admin_write_revision(
  p_submission_id uuid,
  p_operation text,
  p_before jsonb,
  p_after jsonb,
  p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_changes jsonb := public.story_admin_changes(p_before, p_after); v_fields jsonb;
begin
  select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
  into v_fields from jsonb_object_keys(v_changes) fields(key);
  perform audit.write_event(
    'story.revision', 'submission', p_submission_id::text,
    jsonb_build_object(
      'operation', p_operation,
      'changed_fields', v_fields,
      'changes', v_changes,
      'context', coalesce(p_context, '{}'::jsonb)
    )
  );
end;
$$;

create or replace function public.story_admin_dashboard()
returns table (state text, total bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('submission.queue.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select bucket, count(r.submission_id)
  from (values
    ('PENDING'), ('ASSIGNED'), ('IN_REVIEW'), ('APPROVED'),
    ('PUBLISHED'), ('REJECTED'), ('ARCHIVED')
  ) states(bucket)
  left join public.raw_submissions r on
    case when states.bucket = 'ASSIGNED'
      then r.assigned_moderator_id is not null and r.current_state in ('PENDING','IN_REVIEW','NEEDS_EDIT')
      else r.current_state = states.bucket end
  group by bucket
  order by array_position(array['PENDING','ASSIGNED','IN_REVIEW','APPROVED','PUBLISHED','REJECTED','ARCHIVED'], bucket);
end;
$$;

create or replace function public.story_admin_queue(
  p_q text default null,
  p_status text default null,
  p_language text default null,
  p_country text default null,
  p_assignee uuid default null,
  p_unassigned boolean default false,
  p_risk text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'submitted_desc',
  p_page integer default 1,
  p_page_size integer default 25
)
returns table (
  submission_id uuid,
  submission_timestamp timestamptz,
  language_code varchar,
  country text,
  current_state varchar,
  risk_level text,
  risk_flags text[],
  assigned_moderator_id uuid,
  assigned_moderator_name text,
  last_activity timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('submission.queue.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_page < 1 or p_page_size < 1 or p_page_size > 100
     or p_sort not in ('submitted_desc','submitted_asc','activity_desc','activity_asc','status','risk') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  return query
  select r.submission_id, r.submission_timestamp, r.language_code,
    case when public.has_permission('submission.location.read') then r.country else null end,
    r.current_state, coalesce(m.risk_level, 'none'), coalesce(m.risk_flags, array[]::text[]),
    r.assigned_moderator_id, u.display_name::text,
    greatest(r.updated_at, coalesce(m.updated_at, r.updated_at), coalesce(d.updated_at, r.updated_at)),
    count(*) over()
  from public.raw_submissions r
  left join public.submission_review_metadata m using (submission_id)
  left join public.story_editorial_drafts d using (submission_id)
  left join public.users u on u.user_id = r.assigned_moderator_id
  where (nullif(btrim(coalesce(p_q,'')), '') is null
      or r.submission_id::text ilike '%' || btrim(p_q) || '%'
      or d.title ilike '%' || btrim(p_q) || '%')
    and (p_status is null or p_status = '' or
      case when p_status = 'ASSIGNED'
        then r.assigned_moderator_id is not null and r.current_state in ('PENDING','IN_REVIEW','NEEDS_EDIT')
        else r.current_state = p_status end)
    and (p_language is null or p_language = '' or r.language_code = p_language)
    and (p_country is null or p_country = '' or
      (public.has_permission('submission.location.read') and r.country = p_country))
    and (p_assignee is null or r.assigned_moderator_id = p_assignee)
    and (not p_unassigned or r.assigned_moderator_id is null)
    and (p_risk is null or p_risk = '' or coalesce(m.risk_level, 'none') = p_risk)
    and (p_date_from is null or r.submission_timestamp >= p_date_from::timestamptz)
    and (p_date_to is null or r.submission_timestamp < (p_date_to + 1)::timestamptz)
  order by
    case when p_sort = 'submitted_asc' then r.submission_timestamp end asc,
    case when p_sort = 'submitted_desc' then r.submission_timestamp end desc,
    case when p_sort = 'activity_asc' then greatest(r.updated_at, coalesce(m.updated_at,r.updated_at), coalesce(d.updated_at,r.updated_at)) end asc,
    case when p_sort = 'activity_desc' then greatest(r.updated_at, coalesce(m.updated_at,r.updated_at), coalesce(d.updated_at,r.updated_at)) end desc,
    case when p_sort = 'status' then r.current_state end asc,
    case when p_sort = 'risk' then array_position(array['critical','high','medium','low','none'], coalesce(m.risk_level,'none')) end asc,
    r.submission_id
  limit p_page_size offset (p_page - 1) * p_page_size;
end;
$$;

create or replace function public.story_admin_moderators()
returns table (user_id uuid, display_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('submission.queue.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select distinct u.user_id, coalesce(u.display_name, 'Staff member')::text
  from public.users u
  join public.user_role_assignments ura on ura.user_id = u.user_id and ura.revoked_at is null
  join public.role_permissions rp on rp.role_id = ura.role_id
  join public.permissions p on p.permission_id = rp.permission_id
  where u.is_active
    and p.code = 'submission.review'
  order by 2, 1;
end;
$$;

create or replace function public.story_admin_workspace(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype; v_body text; v_result jsonb;
begin
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
      if sqlerrm in ('forbidden','invalid_input') then raise; end if;
      v_skipped:=v_skipped+1;
    end;
  end loop;
  perform audit.write_event('story.bulk.summary','submission_batch',v_batch::text,jsonb_build_object(
    'action',p_action,'requested',cardinality(p_submission_ids),'updated',v_updated,'skipped',v_skipped,'already',v_already));
  return jsonb_build_object('requested',cardinality(p_submission_ids),'updated',v_updated,'skipped',v_skipped,'already',v_already);
end;
$$;

revoke all on function public.can_access_submission(uuid),
  public.story_admin_snapshot(uuid), public.story_admin_changes(jsonb,jsonb),
  public.story_admin_write_revision(uuid,text,jsonb,jsonb,jsonb),
  public.story_admin_dashboard(),
  public.story_admin_queue(text,text,text,text,uuid,boolean,text,date,date,text,integer,integer),
  public.story_admin_moderators(), public.story_admin_workspace(uuid),
  public.story_admin_assign(uuid,uuid),
  public.story_admin_save_review(uuid,text,text[],text),
  public.story_admin_save_draft(uuid,jsonb),
  public.story_admin_transition(uuid,text,text,text),
  public.story_admin_bulk(uuid[],text,uuid,text)
from public, anon, authenticated;

grant execute on function public.can_access_submission(uuid),
  public.story_admin_dashboard(),
  public.story_admin_queue(text,text,text,text,uuid,boolean,text,date,date,text,integer,integer),
  public.story_admin_moderators(), public.story_admin_workspace(uuid),
  public.story_admin_assign(uuid,uuid),
  public.story_admin_save_review(uuid,text,text[],text),
  public.story_admin_save_draft(uuid,jsonb),
  public.story_admin_transition(uuid,text,text,text),
  public.story_admin_bulk(uuid[],text,uuid,text)
to authenticated;

-- Authenticated table DML is deliberately unavailable. The audited RPCs are
-- the sole mutation boundary for public story records and relationships.
revoke insert, update, delete on public.published_stories from authenticated;
revoke insert, update, delete on public.published_story_tags from authenticated;
revoke insert, update, delete on public.podcast_episode_stories from authenticated;

commit;
