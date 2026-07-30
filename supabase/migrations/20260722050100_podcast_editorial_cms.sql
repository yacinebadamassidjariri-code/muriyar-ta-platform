-- M-48 — complete Podcast Editorial CMS.
-- Extends, but does not replace, the canonical podcast media lifecycle.
begin;

alter table public.podcast_episodes
  add column if not exists season_number smallint,
  add column if not exists artwork_alt_text varchar(300),
  add column if not exists seo_title varchar(200),
  add column if not exists seo_description varchar(320),
  add column if not exists canonical_url varchar(500),
  add column if not exists internal_notes text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_by uuid references public.users(user_id) on delete set null,
  add column if not exists unpublished_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_from_status public.podcast_status,
  add column if not exists updated_by uuid references public.users(user_id) on delete set null;

alter table public.podcast_episodes
  drop constraint if exists podcast_season_positive_chk,
  add constraint podcast_season_positive_chk check (season_number is null or season_number > 0),
  drop constraint if exists podcast_episode_number_positive_chk,
  add constraint podcast_episode_number_positive_chk check (episode_number is null or episode_number > 0),
  drop constraint if exists podcast_internal_notes_len_chk,
  add constraint podcast_internal_notes_len_chk check (internal_notes is null or char_length(internal_notes) <= 10000),
  drop constraint if exists podcast_schedule_state_chk,
  add constraint podcast_schedule_state_chk check (
    (status = 'scheduled' and scheduled_at is not null and scheduled_by is not null)
    or (status <> 'scheduled')
  );

create table if not exists public.podcast_episode_resources (
  episode_id uuid not null references public.podcast_episodes(episode_id) on delete cascade,
  resource_id uuid not null references public.resources(resource_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (episode_id, resource_id)
);

create table if not exists public.podcast_episode_reports (
  episode_id uuid not null references public.podcast_episodes(episode_id) on delete cascade,
  report_id uuid not null references public.reports(report_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (episode_id, report_id)
);

create index if not exists podcast_episode_status_schedule_idx
  on public.podcast_episodes(status, scheduled_at);
create index if not exists podcast_episode_updated_by_idx
  on public.podcast_episodes(updated_by);
create index if not exists podcast_episode_transcript_idx
  on public.podcast_episodes(transcript_status) where transcript_status <> 'none';
create index if not exists podcast_episode_resources_resource_idx
  on public.podcast_episode_resources(resource_id);
create index if not exists podcast_episode_reports_report_idx
  on public.podcast_episode_reports(report_id);

alter table public.podcast_episode_resources enable row level security;
alter table public.podcast_episode_reports enable row level security;

drop policy if exists podcast_episode_resources_read on public.podcast_episode_resources;
create policy podcast_episode_resources_read on public.podcast_episode_resources
  for select to anon, authenticated using (
    public.has_permission('podcast.edit') or exists (
      select 1 from public.podcast_episodes e
      where e.episode_id = podcast_episode_resources.episode_id and e.status = 'published'
    )
  );
drop policy if exists podcast_episode_reports_read on public.podcast_episode_reports;
create policy podcast_episode_reports_read on public.podcast_episode_reports
  for select to anon, authenticated using (
    public.has_permission('podcast.edit') or exists (
      select 1 from public.podcast_episodes e
      where e.episode_id = podcast_episode_reports.episode_id and e.status = 'published'
    )
  );

grant select on public.podcast_episode_resources, public.podcast_episode_reports to anon, authenticated;
revoke insert, update, delete on public.podcast_episode_resources, public.podcast_episode_reports from anon, authenticated;
revoke insert, update, delete on public.podcast_episode_stories, public.podcast_episode_tags from authenticated;

-- Internal editorial notes and transcript content never enter generic audit rows.
create or replace function audit.scrub(j jsonb)
returns jsonb language sql immutable as $$
  select coalesce(j, '{}'::jsonb)
    - 'body_text' - 'body' - 'country' - 'region'
    - 'contact_email_encrypted' - 'contact_email' - 'email'
    - 'statement_text' - 'message' - 'note' - 'internal_notes'
    - 'twofa_secret' - 'password_hash' - 'access_token' - 'refresh_token'
    - 'signed_url' - 'signedUrl' - 'storage_path'
    - 'previous_value' - 'new_value' - 'transcript' - 'raw_sql_error';
$$;

create or replace function public.podcast_admin_snapshot(p_episode_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', e.title, 'slug', e.slug, 'description', e.description,
    'episode_summary', e.episode_summary, 'language_code', e.language_code,
    'episode_number', e.episode_number, 'season_number', e.season_number,
    'series_slug', e.series_slug, 'episode_kind', e.episode_kind,
    'content_advisory', e.content_advisory, 'status', e.status,
    'scheduled_at', e.scheduled_at, 'published_at', e.published_at,
    'unpublished_at', e.unpublished_at, 'archived_at', e.archived_at,
    'is_featured', e.is_featured, 'artwork_alt_text', e.artwork_alt_text,
    'transcript', case when nullif(btrim(coalesce(e.transcript,'')),'') is null then null else '[redacted]' end,
    'transcript_status', e.transcript_status, 'chapters', coalesce(e.chapters, '[]'::jsonb),
    'seo_title', e.seo_title, 'seo_description', e.seo_description,
    'canonical_url', e.canonical_url,
    'internal_notes', case when e.internal_notes is null then null else '[redacted]' end,
    'tag_ids', coalesce((select jsonb_agg(t.tag_id order by t.tag_id) from public.podcast_episode_tags t where t.episode_id=e.episode_id),'[]'::jsonb),
    'story_ids', coalesce((select jsonb_agg(s.story_id order by s.story_id) from public.podcast_episode_stories s where s.episode_id=e.episode_id),'[]'::jsonb),
    'resource_ids', coalesce((select jsonb_agg(r.resource_id order by r.resource_id) from public.podcast_episode_resources r where r.episode_id=e.episode_id),'[]'::jsonb),
    'report_ids', coalesce((select jsonb_agg(r.report_id order by r.report_id) from public.podcast_episode_reports r where r.episode_id=e.episode_id),'[]'::jsonb),
    'audio_asset_id', e.audio_asset_id, 'artwork_asset_id', e.artwork_asset_id
  ) from public.podcast_episodes e where e.episode_id=p_episode_id;
$$;

create or replace function public.podcast_admin_changes(p_before jsonb, p_after jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare v_key text; v_result jsonb := '{}'::jsonb;
begin
  for v_key in select key from (
    select jsonb_object_keys(coalesce(p_before,'{}'::jsonb)) key
    union select jsonb_object_keys(coalesce(p_after,'{}'::jsonb)) key
  ) keys order by key loop
    if p_before->v_key is distinct from p_after->v_key then
      v_result := v_result || jsonb_build_object(v_key,jsonb_build_object(
        'before',coalesce(p_before->v_key,'null'::jsonb),
        'after',coalesce(p_after->v_key,'null'::jsonb)
      ));
    end if;
  end loop;
  return v_result;
end;
$$;

create or replace function public.podcast_admin_write_revision(
  p_episode_id uuid, p_operation text, p_before jsonb, p_after jsonb, p_context jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path=public,audit as $$
declare v_changes jsonb;
begin
  v_changes := public.podcast_admin_changes(p_before,p_after);
  perform audit.write_event('podcast.revision','podcast_episode',p_episode_id::text,
    jsonb_build_object('operation',p_operation,'changed_fields',coalesce((select jsonb_agg(key order by key) from jsonb_object_keys(v_changes) key),'[]'::jsonb),'changes',v_changes,'context',coalesce(p_context,'{}'::jsonb)));
end;
$$;

create or replace function public.podcast_admin_validate_chapters(p_chapters jsonb, p_duration integer)
returns jsonb language plpgsql immutable set search_path=public as $$
declare item jsonb; v_start integer; v_title text; v_description text; v_previous integer := -1; v_result jsonb := '[]'::jsonb;
begin
  if p_chapters is null then return '[]'::jsonb; end if;
  if jsonb_typeof(p_chapters)<>'array' or jsonb_array_length(p_chapters)>100 then raise exception 'podcast_invalid_chapters' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_chapters) loop
    if jsonb_typeof(item)<>'object' or not (item ? 'start_seconds') or not (item ? 'title') then raise exception 'podcast_invalid_chapters' using errcode='22023'; end if;
    begin v_start := (item->>'start_seconds')::integer; exception when others then raise exception 'podcast_invalid_chapters' using errcode='22023'; end;
    v_title := btrim(coalesce(item->>'title','')); v_description := nullif(btrim(coalesce(item->>'description','')),'');
    if v_start<0 or v_start<v_previous or (p_duration is not null and v_start>p_duration) or char_length(v_title) not between 1 and 200 or char_length(coalesce(v_description,''))>500 then
      raise exception 'podcast_invalid_chapters' using errcode='22023';
    end if;
    v_previous:=v_start;
    v_result:=v_result||jsonb_build_array(jsonb_build_object('start_seconds',v_start,'title',v_title,'description',v_description));
  end loop;
  return v_result;
end;
$$;

create or replace function public.podcast_admin_save(p_episode_id uuid default null, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,audit as $$
declare
  v_id uuid:=p_episode_id; v_before jsonb:='{}'::jsonb; v_after jsonb; v_core jsonb;
  v_allowed text[]:=array['title','slug','description','episode_summary','language_code','episode_number','season_number','series_slug','episode_kind','content_advisory','is_featured','artwork_alt_text','transcript','transcript_status','chapters','seo_title','seo_description','canonical_url','internal_notes','tag_ids','story_ids','resource_ids','report_ids'];
  v_chapters jsonb; v_tags integer[]:=array[]::integer[]; v_stories uuid[]:=array[]::uuid[]; v_resources uuid[]:=array[]::uuid[]; v_reports uuid[]:=array[]::uuid[];
begin
  if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or exists(select 1 from jsonb_object_keys(p_payload) key where not key=any(v_allowed)) then raise exception 'invalid_payload' using errcode='22023'; end if;
  if v_id is not null then
    select public.podcast_admin_snapshot(v_id) into v_before;
    if v_before is null then raise exception 'not_found' using errcode='P0002'; end if;
    if (v_before->>'status')='archived' then raise exception 'podcast_not_editable' using errcode='22023'; end if;
  end if;
  v_core := p_payload - array['episode_number','season_number','artwork_alt_text','transcript','transcript_status','chapters','seo_title','seo_description','canonical_url','internal_notes','tag_ids','story_ids','resource_ids','report_ids'];
  v_id := public.save_podcast_episode_draft(v_id,v_core);

  if p_payload ? 'episode_number' and nullif(p_payload->>'episode_number','') is not null and (p_payload->>'episode_number')::integer<=0 then raise exception 'podcast_invalid_episode_number' using errcode='22023'; end if;
  if p_payload ? 'season_number' and nullif(p_payload->>'season_number','') is not null and (p_payload->>'season_number')::integer<=0 then raise exception 'podcast_invalid_season' using errcode='22023'; end if;
  if char_length(coalesce(p_payload->>'artwork_alt_text',''))>300 or char_length(coalesce(p_payload->>'transcript',''))>250000 or char_length(coalesce(p_payload->>'seo_title',''))>200 or char_length(coalesce(p_payload->>'seo_description',''))>320 or char_length(coalesce(p_payload->>'internal_notes',''))>10000 then raise exception 'invalid_payload' using errcode='22023'; end if;
  if p_payload ? 'canonical_url' and nullif(btrim(coalesce(p_payload->>'canonical_url','')),'') is not null and p_payload->>'canonical_url' !~* '^https?://[^[:space:]]+$' then raise exception 'podcast_invalid_url' using errcode='22023'; end if;
  if p_payload ? 'transcript_status' and coalesce(p_payload->>'transcript_status','none') not in ('none','auto','human_reviewed') then raise exception 'podcast_invalid_transcript_status' using errcode='22023'; end if;
  select public.podcast_admin_validate_chapters(coalesce(p_payload->'chapters',(select chapters from public.podcast_episodes where episode_id=v_id),'[]'::jsonb),(select duration_seconds from public.podcast_episodes where episode_id=v_id)) into v_chapters;
  begin
    if p_payload ? 'tag_ids' then select coalesce(array_agg(distinct value::integer),array[]::integer[]) into v_tags from jsonb_array_elements_text(p_payload->'tag_ids') value; else select coalesce(array_agg(tag_id),array[]::integer[]) into v_tags from public.podcast_episode_tags where episode_id=v_id; end if;
    if p_payload ? 'story_ids' then select coalesce(array_agg(distinct value::uuid),array[]::uuid[]) into v_stories from jsonb_array_elements_text(p_payload->'story_ids') value; else select coalesce(array_agg(story_id),array[]::uuid[]) into v_stories from public.podcast_episode_stories where episode_id=v_id; end if;
    if p_payload ? 'resource_ids' then select coalesce(array_agg(distinct value::uuid),array[]::uuid[]) into v_resources from jsonb_array_elements_text(p_payload->'resource_ids') value; else select coalesce(array_agg(resource_id),array[]::uuid[]) into v_resources from public.podcast_episode_resources where episode_id=v_id; end if;
    if p_payload ? 'report_ids' then select coalesce(array_agg(distinct value::uuid),array[]::uuid[]) into v_reports from jsonb_array_elements_text(p_payload->'report_ids') value; else select coalesce(array_agg(report_id),array[]::uuid[]) into v_reports from public.podcast_episode_reports where episode_id=v_id; end if;
  exception when others then raise exception 'invalid_payload' using errcode='22023'; end;
  if cardinality(v_tags)>50 or cardinality(v_stories)>50 or cardinality(v_resources)>50 or cardinality(v_reports)>50 then raise exception 'invalid_payload' using errcode='22023'; end if;
  if exists(select 1 from unnest(v_tags) id where not exists(select 1 from public.issue_tags where tag_id=id))
    or exists(select 1 from unnest(v_stories) id where not exists(select 1 from public.published_stories where story_id=id and status='published'))
    or exists(select 1 from unnest(v_resources) id where not exists(select 1 from public.resources where resource_id=id and status='active'))
    or exists(select 1 from unnest(v_reports) id where not exists(select 1 from public.reports where report_id=id and status='published')) then raise exception 'podcast_invalid_relationship' using errcode='23503'; end if;
  begin
    update public.podcast_episodes set
      episode_number=case when p_payload?'episode_number' then nullif(p_payload->>'episode_number','')::integer else episode_number end,
      season_number=case when p_payload?'season_number' then nullif(p_payload->>'season_number','')::smallint else season_number end,
      artwork_alt_text=case when p_payload?'artwork_alt_text' then nullif(btrim(p_payload->>'artwork_alt_text'),'') else artwork_alt_text end,
      transcript=case when p_payload?'transcript' then nullif(p_payload->>'transcript','') else transcript end,
      transcript_status=case when p_payload?'transcript_status' then (p_payload->>'transcript_status')::public.podcast_transcript_status else transcript_status end,
      chapters=v_chapters,
      seo_title=case when p_payload?'seo_title' then nullif(btrim(p_payload->>'seo_title'),'') else seo_title end,
      seo_description=case when p_payload?'seo_description' then nullif(btrim(p_payload->>'seo_description'),'') else seo_description end,
      canonical_url=case when p_payload?'canonical_url' then nullif(btrim(p_payload->>'canonical_url'),'') else canonical_url end,
      internal_notes=case when p_payload?'internal_notes' then nullif(btrim(p_payload->>'internal_notes'),'') else internal_notes end,
      updated_by=auth.uid()
    where episode_id=v_id;
  exception when unique_violation then raise exception 'podcast_episode_number_taken' using errcode='23505'; end;
  delete from public.podcast_episode_tags where episode_id=v_id; insert into public.podcast_episode_tags select v_id,unnest(v_tags) on conflict do nothing;
  delete from public.podcast_episode_stories where episode_id=v_id; insert into public.podcast_episode_stories select v_id,unnest(v_stories) on conflict do nothing;
  delete from public.podcast_episode_resources where episode_id=v_id; insert into public.podcast_episode_resources(episode_id,resource_id) select v_id,unnest(v_resources) on conflict do nothing;
  delete from public.podcast_episode_reports where episode_id=v_id; insert into public.podcast_episode_reports(episode_id,report_id) select v_id,unnest(v_reports) on conflict do nothing;
  v_after:=public.podcast_admin_snapshot(v_id);
  perform public.podcast_admin_write_revision(v_id,case when p_episode_id is null then 'create' else 'save_draft' end,v_before,v_after);
  return jsonb_build_object('episodeId',v_id,'status',v_after->>'status');
end;
$$;

create or replace function public.podcast_admin_validate_publishable(p_episode_id uuid)
returns void language plpgsql stable security definer set search_path=public as $$
declare e public.podcast_episodes%rowtype;
begin
  select * into e from public.podcast_episodes where episode_id=p_episode_id;
  if not found then raise exception 'not_found' using errcode='P0002'; end if;
  if nullif(btrim(e.title),'') is null then raise exception 'title_required' using errcode='23514'; end if;
  if e.slug is null then raise exception 'slug_format' using errcode='23514'; end if;
  if e.series_slug is null then raise exception 'podcast_invalid_series' using errcode='23503'; end if;
  if e.episode_kind is null then raise exception 'podcast_invalid_kind' using errcode='22023'; end if;
  if e.audio_asset_id is null and nullif(btrim(coalesce(e.external_audio_url,'')),'') is null then raise exception 'podcast_audio_required' using errcode='23514'; end if;
  if e.audio_asset_id is not null and not exists(select 1 from public.podcast_media_assets a where a.asset_id=e.audio_asset_id and a.status='ready' and a.kind='audio') then raise exception 'podcast_audio_not_ready' using errcode='22023'; end if;
end;
$$;

create or replace function public.podcast_admin_transition(p_episode_id uuid,p_action text,p_scheduled_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,audit as $$
declare e public.podcast_episodes%rowtype; v_before jsonb; v_after jsonb;
begin
  if not public.has_permission('podcast.publish') then raise exception 'forbidden' using errcode='42501'; end if;
  select * into e from public.podcast_episodes where episode_id=p_episode_id for update; if not found then raise exception 'not_found' using errcode='P0002'; end if;
  v_before:=public.podcast_admin_snapshot(p_episode_id);
  if p_action='publish' then
    if e.status not in ('draft','scheduled') then raise exception 'podcast_invalid_transition' using errcode='22023'; end if;
    perform public.podcast_admin_validate_publishable(p_episode_id);
    update public.podcast_episodes set status='published',published_at=now(),published_by=auth.uid(),scheduled_at=null,scheduled_by=null,unpublished_at=null,archived_at=null,updated_by=auth.uid() where episode_id=p_episode_id;
  elsif p_action='schedule' then
    if e.status<>'draft' or p_scheduled_at is null or p_scheduled_at<=now() then raise exception 'podcast_invalid_schedule' using errcode='22023'; end if;
    perform public.podcast_admin_validate_publishable(p_episode_id);
    update public.podcast_episodes set status='scheduled',scheduled_at=p_scheduled_at,scheduled_by=auth.uid(),updated_by=auth.uid() where episode_id=p_episode_id;
  elsif p_action='unpublish' then
    if e.status not in ('published','scheduled') then raise exception 'podcast_invalid_transition' using errcode='22023'; end if;
    update public.podcast_episodes set status='draft',is_featured=false,scheduled_at=null,scheduled_by=null,unpublished_at=case when e.status='published' then now() else unpublished_at end,updated_by=auth.uid() where episode_id=p_episode_id;
  elsif p_action='archive' then
    if e.status='archived' then raise exception 'already' using errcode='22023'; end if;
    update public.podcast_episodes set archived_from_status=e.status,status='archived',archived_at=now(),is_featured=false,scheduled_at=null,scheduled_by=null,updated_by=auth.uid() where episode_id=p_episode_id;
  elsif p_action='restore' then
    if e.status<>'archived' then raise exception 'podcast_invalid_transition' using errcode='22023'; end if;
    update public.podcast_episodes set status='draft',archived_at=null,updated_by=auth.uid() where episode_id=p_episode_id;
  else raise exception 'invalid_input' using errcode='22023'; end if;
  v_after:=public.podcast_admin_snapshot(p_episode_id); perform public.podcast_admin_write_revision(p_episode_id,p_action,v_before,v_after,jsonb_build_object('scheduled_at',p_scheduled_at));
  return jsonb_build_object('status',v_after->>'status','publishedAt',v_after->>'published_at','scheduledAt',v_after->>'scheduled_at');
end;
$$;

create or replace function public.podcast_admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object('total',count(*),'published',count(*)filter(where status='published'),'drafts',count(*)filter(where status='draft'),'scheduled',count(*)filter(where status='scheduled'),'archived',count(*)filter(where status='archived'),'totalListeningSeconds',coalesce(sum(duration_seconds),0),'transcriptComplete',count(*)filter(where transcript_status<>'none' and nullif(btrim(coalesce(transcript,'')),'') is not null)) into v from public.podcast_episodes;
  return v;
end;
$$;

create or replace function public.podcast_admin_list(p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p_page int:=greatest(1,coalesce((p_filters->>'page')::int,1)); p_size int:=least(100,greatest(1,coalesce((p_filters->>'pageSize')::int,25))); p_sort text:=coalesce(p_filters->>'sort','updated_desc'); v jsonb;
begin
  if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_sort not in ('updated_desc','updated_asc','title_asc','title_desc','publish_desc','episode_asc') then raise exception 'invalid_input' using errcode='22023'; end if;
  with filtered as (
    select e.*,u.display_name updated_by_display,a.storage_bucket artwork_bucket,a.storage_path artwork_path,a.status artwork_status
    from public.podcast_episodes e left join public.users u on u.user_id=e.updated_by left join public.podcast_media_assets a on a.asset_id=e.artwork_asset_id
    where (nullif(btrim(coalesce(p_filters->>'q','')),'') is null or e.title ilike '%'||btrim(p_filters->>'q')||'%' or e.slug ilike '%'||btrim(p_filters->>'q')||'%')
      and (nullif(p_filters->>'status','') is null or e.status::text=p_filters->>'status')
      and (nullif(p_filters->>'language','') is null or e.language_code=p_filters->>'language')
      and (not (p_filters?'featured') or e.is_featured=(p_filters->>'featured')::boolean)
      and (not (p_filters?'transcriptComplete') or (e.transcript_status<>'none' and nullif(btrim(coalesce(e.transcript,'')),'') is not null)=(p_filters->>'transcriptComplete')::boolean)
      and (not (p_filters?'scheduled') or (e.status='scheduled')=(p_filters->>'scheduled')::boolean)
      and (nullif(p_filters->>'publishedFrom','') is null or e.published_at>=(p_filters->>'publishedFrom')::date)
      and (nullif(p_filters->>'publishedTo','') is null or e.published_at<((p_filters->>'publishedTo')::date+1))
  ), ordered as (
    select *,count(*)over() total_count,row_number() over(order by
      case when p_sort='updated_desc' then updated_at end desc,case when p_sort='updated_asc' then updated_at end asc,
      case when p_sort='title_asc' then title end asc,case when p_sort='title_desc' then title end desc,
      case when p_sort='publish_desc' then published_at end desc,case when p_sort='episode_asc' then episode_number end asc nulls last,episode_id
    ) row_order from filtered order by
      case when p_sort='updated_desc' then updated_at end desc,case when p_sort='updated_asc' then updated_at end asc,
      case when p_sort='title_asc' then title end asc,case when p_sort='title_desc' then title end desc,
      case when p_sort='publish_desc' then published_at end desc,case when p_sort='episode_asc' then episode_number end asc nulls last,episode_id
    limit p_size offset (p_page-1)*p_size
  ) select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('episodeId',episode_id,'title',title,'slug',slug,'status',status,'languageCode',language_code,'durationSeconds',duration_seconds,'publishedAt',published_at,'scheduledAt',scheduled_at,'featured',is_featured,'transcriptComplete',transcript_status<>'none' and nullif(btrim(coalesce(transcript,'')),'') is not null,'updatedAt',updated_at,'updatedBy',updated_by_display,'artworkBucket',case when artwork_status='ready' then artwork_bucket end,'artworkPath',case when artwork_status='ready' then artwork_path end) order by row_order),'[]'::jsonb),'total',coalesce(max(total_count),0),'page',p_page,'pageSize',p_size) into v from ordered;
  return v;
end;
$$;

create or replace function public.podcast_admin_workspace(p_episode_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,audit as $$
declare v jsonb;
begin
  if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if;
  if not exists(select 1 from public.podcast_episodes where episode_id=p_episode_id) then raise exception 'not_found' using errcode='P0002'; end if;
  select jsonb_build_object(
    'episode',to_jsonb(e)-'internal_notes'-'transcript',
    'transcript',coalesce(e.transcript,''),'internalNotes',coalesce(e.internal_notes,''),
    'tagIds',coalesce((select jsonb_agg(tag_id order by tag_id) from public.podcast_episode_tags where episode_id=e.episode_id),'[]'::jsonb),
    'storyIds',coalesce((select jsonb_agg(story_id order by story_id) from public.podcast_episode_stories where episode_id=e.episode_id),'[]'::jsonb),
    'resourceIds',coalesce((select jsonb_agg(resource_id order by resource_id) from public.podcast_episode_resources where episode_id=e.episode_id),'[]'::jsonb),
    'reportIds',coalesce((select jsonb_agg(report_id order by report_id) from public.podcast_episode_reports where episode_id=e.episode_id),'[]'::jsonb),
    'audio',case when a.asset_id is null then null else to_jsonb(a)-'storage_path'-'sha256' end,
    'artwork',case when w.asset_id is null then null else to_jsonb(w)-'storage_path'-'sha256' end,
    'history',coalesce((select jsonb_agg(jsonb_build_object('auditId',l.audit_id,'actor',coalesce(u.display_name,'System'),'operation',l.metadata->>'operation','changedFields',l.metadata->'changed_fields','changes',l.metadata->'changes','occurredAt',l.occurred_at) order by l.occurred_at desc) from audit.audit_log l left join public.users u on u.user_id=l.actor_user_id where l.entity_type='podcast_episode' and l.entity_id=e.episode_id::text and l.action='podcast.revision'),'[]'::jsonb)
  ) into v from public.podcast_episodes e left join public.podcast_media_assets a on a.asset_id=e.audio_asset_id left join public.podcast_media_assets w on w.asset_id=e.artwork_asset_id where e.episode_id=p_episode_id;
  return v;
end;
$$;

create or replace function public.podcast_admin_lookups()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object(
    'languages',coalesce((select jsonb_agg(jsonb_build_object('id',language_code,'label',name) order by name) from public.supported_languages where is_active),'[]'::jsonb),
    'tags',coalesce((select jsonb_agg(jsonb_build_object('id',tag_id,'label',name) order by name) from public.issue_tags),'[]'::jsonb),
    'stories',coalesce((select jsonb_agg(jsonb_build_object('id',story_id,'label',title) order by title) from public.published_stories where status='published'),'[]'::jsonb),
    'resources',coalesce((select jsonb_agg(jsonb_build_object('id',resource_id,'label',name) order by name) from public.resources where status='active'),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',report_id,'label',title) order by title) from public.reports where status='published'),'[]'::jsonb)
  ) into v; return v;
end;
$$;

create or replace function public.podcast_admin_bulk(p_episode_ids uuid[],p_action text,p_value text default null,p_tag_ids integer[] default null)
returns jsonb language plpgsql security definer set search_path=public,audit as $$
declare v_id uuid; v_requested int:=coalesce(cardinality(p_episode_ids),0); v_updated int:=0; v_skipped int:=0; v_already int:=0; e public.podcast_episodes%rowtype; v_before jsonb; v_after jsonb;
begin
  if p_action in ('publish','unpublish','archive','restore','feature','unfeature') then if not public.has_permission('podcast.publish') then raise exception 'forbidden' using errcode='42501'; end if; elsif p_action in ('language','tags') then if not public.has_permission('podcast.edit') then raise exception 'forbidden' using errcode='42501'; end if; else raise exception 'invalid_input' using errcode='22023'; end if;
  if v_requested<1 or v_requested>100 then raise exception 'invalid_input' using errcode='22023'; end if;
  foreach v_id in array p_episode_ids loop
    begin
      select * into e from public.podcast_episodes where episode_id=v_id for update; if not found then v_skipped:=v_skipped+1; continue; end if;
      if (p_action='publish' and e.status='published') or (p_action='unpublish' and e.status='draft') or (p_action='archive' and e.status='archived') or (p_action='restore' and e.status<>'archived') or (p_action='feature' and e.is_featured) or (p_action='unfeature' and not e.is_featured) or (p_action='language' and e.language_code=p_value) then v_already:=v_already+1; continue; end if;
      if p_action in ('publish','unpublish','archive','restore') then perform public.podcast_admin_transition(v_id,p_action,null);
      else
        v_before:=public.podcast_admin_snapshot(v_id);
        if p_action='feature' then if e.status<>'published' then v_skipped:=v_skipped+1; continue; end if; update public.podcast_episodes set is_featured=true,updated_by=auth.uid() where episode_id=v_id;
        elsif p_action='unfeature' then update public.podcast_episodes set is_featured=false,updated_by=auth.uid() where episode_id=v_id;
        elsif p_action='language' then if not exists(select 1 from public.supported_languages where language_code=p_value and is_active) then raise exception 'unsupported_language' using errcode='23503'; end if; update public.podcast_episodes set language_code=p_value,updated_by=auth.uid() where episode_id=v_id;
        else if exists(select 1 from unnest(coalesce(p_tag_ids,array[]::integer[])) id where not exists(select 1 from public.issue_tags where tag_id=id)) then raise exception 'podcast_invalid_relationship' using errcode='23503'; end if; insert into public.podcast_episode_tags select v_id,unnest(coalesce(p_tag_ids,array[]::integer[])) on conflict do nothing; end if;
        v_after:=public.podcast_admin_snapshot(v_id); perform public.podcast_admin_write_revision(v_id,'bulk_'||p_action,v_before,v_after);
      end if;
      v_updated:=v_updated+1;
    exception when others then v_skipped:=v_skipped+1;
    end;
  end loop;
  perform audit.write_event('podcast.bulk.summary','podcast_episode',null,jsonb_build_object('action',p_action,'requested',v_requested,'updated',v_updated,'skipped',v_skipped,'already',v_already));
  return jsonb_build_object('requested',v_requested,'updated',v_updated,'skipped',v_skipped,'already',v_already);
end;
$$;

create or replace function public.publish_scheduled_podcast_episodes()
returns integer language plpgsql security definer set search_path=public,audit as $$
declare e public.podcast_episodes%rowtype; v_count int:=0; v_before jsonb; v_after jsonb;
begin
  for e in select * from public.podcast_episodes where status='scheduled' and scheduled_at<=now() for update skip locked loop
    begin
      perform public.podcast_admin_validate_publishable(e.episode_id); v_before:=public.podcast_admin_snapshot(e.episode_id);
      update public.podcast_episodes set status='published',published_at=scheduled_at,published_by=scheduled_by,scheduled_at=null,scheduled_by=null,unpublished_at=null,updated_by=scheduled_by where episode_id=e.episode_id;
      v_after:=public.podcast_admin_snapshot(e.episode_id); perform public.podcast_admin_write_revision(e.episode_id,'scheduled_publish',v_before,v_after); v_count:=v_count+1;
    exception when others then perform audit.write_event('podcast.schedule.failure','podcast_episode',e.episode_id::text,jsonb_build_object('scheduled_at',e.scheduled_at)); end;
  end loop; return v_count;
end;
$$;

-- Keep the established public projection; private editorial fields stay absent.
drop view if exists public.podcast_episodes_public;
create view public.podcast_episodes_public with (security_invoker=on) as
select e.episode_id,e.slug,e.episode_number,e.title,e.description,e.audio_asset_id,e.external_audio_url,e.duration_seconds,e.transcript,e.cover_art_asset_id,e.language_code,e.streaming_links,e.published_at,e.series_slug,e.episode_kind,e.content_advisory,e.transcript_status,e.episode_summary,e.chapters,e.artwork_asset_id,
  a.asset_id audio_asset_id_public,a.storage_bucket audio_storage_bucket_public,a.storage_path audio_storage_path_public,a.mime_type audio_mime_type_public,a.size_bytes audio_size_bytes_public,a.duration_seconds audio_duration_seconds_public,
  w.asset_id artwork_asset_id_public,w.storage_bucket artwork_storage_bucket_public,w.storage_path artwork_storage_path_public,w.mime_type artwork_mime_type_public,w.size_bytes artwork_size_bytes_public
from public.podcast_episodes e
left join public.podcast_media_assets a on a.asset_id=e.audio_asset_id and a.status='ready' and a.kind='audio'
left join public.podcast_media_assets w on w.asset_id=e.artwork_asset_id and w.status='ready' and w.kind='artwork'
where e.status='published';
grant select on public.podcast_episodes_public to anon,authenticated;

revoke all on function public.podcast_admin_snapshot(uuid),public.podcast_admin_changes(jsonb,jsonb),public.podcast_admin_write_revision(uuid,text,jsonb,jsonb,jsonb),public.podcast_admin_validate_chapters(jsonb,integer),public.podcast_admin_validate_publishable(uuid),public.publish_scheduled_podcast_episodes() from public,anon,authenticated,service_role;
revoke all on function public.podcast_admin_save(uuid,jsonb),public.podcast_admin_transition(uuid,text,timestamptz),public.podcast_admin_dashboard(),public.podcast_admin_list(jsonb),public.podcast_admin_workspace(uuid),public.podcast_admin_lookups(),public.podcast_admin_bulk(uuid[],text,text,integer[]) from public,anon,authenticated,service_role;
grant execute on function public.podcast_admin_save(uuid,jsonb),public.podcast_admin_transition(uuid,text,timestamptz),public.podcast_admin_dashboard(),public.podcast_admin_list(jsonb),public.podcast_admin_workspace(uuid),public.podcast_admin_lookups(),public.podcast_admin_bulk(uuid[],text,text,integer[]) to authenticated;

do $$ begin
  if exists(select 1 from cron.job where jobname='publish-scheduled-podcasts') then perform cron.unschedule((select jobid from cron.job where jobname='publish-scheduled-podcasts' limit 1)); end if;
  perform cron.schedule('publish-scheduled-podcasts','*/5 * * * *','select public.publish_scheduled_podcast_episodes();');
end $$;

commit;
