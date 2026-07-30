\set ON_ERROR_STOP on
begin;

insert into auth.users(id,aud,role,email,created_at,updated_at) values
  ('10000000-0000-4000-8000-000000000058','authenticated','authenticated','m48-editor@example.invalid',now(),now()),
  ('10000000-0000-4000-8000-000000000059','authenticated','authenticated','m48-unauthorized@example.invalid',now(),now());
insert into public.users(user_id,email,display_name) values
  ('10000000-0000-4000-8000-000000000058','m48-editor@example.invalid','M-48 Editor'),
  ('10000000-0000-4000-8000-000000000059','m48-unauthorized@example.invalid','M-48 Unauthorized');
insert into public.user_role_assignments(user_id,role_id)
select '10000000-0000-4000-8000-000000000058',role_id from public.roles where name='managing_editor';
insert into public.user_role_assignments(user_id,role_id)
select '10000000-0000-4000-8000-000000000059',role_id from public.roles where name='translator';

insert into public.consent_versions(version_number,is_active,effective_from)
select 'm48-test',true,now() where not exists(select 1 from public.consent_versions where is_active);
insert into public.raw_submissions(language_code,consent_given,consent_version_id,consent_timestamp,consent_language,char_count,current_state)
select 'en',true,consent_version_id,now(),'en',100,'PUBLISHED' from public.consent_versions where is_active limit 1;
insert into public.published_stories(source_submission_ref,title,slug,body_text,language_code,status,published_at)
select submission_id,'M-48 Fictional Related Story','m48-fictional-related-story','Fictional public content used only in a rolled-back database test.','en','published',now()
from public.raw_submissions order by created_at desc limit 1;
insert into public.media_assets(asset_type,storage_key,mime_type,file_size_bytes,is_public)
values('report_pdf','m48/fixture.pdf','application/pdf',100,true);
insert into public.reports(title,pdf_asset_id,language_code,status,published_at)
select 'M-48 Fictional Report',asset_id,'en','published',now() from public.media_assets where storage_key='m48/fixture.pdf';

create temporary table m48_test(episode_id uuid primary key,asset_id uuid);
grant select,insert,update on m48_test to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000058';

insert into m48_test(episode_id)
select (public.podcast_admin_save(null,jsonb_build_object(
  'title','M-48 Fictional Episode','slug','m48-fictional-episode','description','A harmless test episode.',
  'episode_summary','A fictional summary.','language_code','en','episode_number',48,'season_number',1,
  'series_slug','anonymous-voices','episode_kind','discussion','content_advisory','none',
  'artwork_alt_text','Abstract test artwork','transcript','[00:00] Host: This is a fictional transcript.',
  'transcript_status','human_reviewed','chapters',jsonb_build_array(jsonb_build_object('start_seconds',0,'title','Opening','description','Test opening')),
  'seo_title','M-48 Fictional Episode','seo_description','Fictional test metadata.','canonical_url','https://example.invalid/podcast/m48-fictional-episode',
  'internal_notes','Private fictional editorial note.',
  'tag_ids',coalesce((select jsonb_agg(tag_id) from (select tag_id from public.issue_tags order by tag_id limit 1)t),'[]'::jsonb),
  'story_ids',coalesce((select jsonb_agg(story_id) from public.published_stories where slug='m48-fictional-related-story'),'[]'::jsonb),
  'resource_ids',coalesce((select jsonb_agg(resource_id) from (select resource_id from public.resources where status='active' order by name limit 1)r),'[]'::jsonb),
  'report_ids',coalesce((select jsonb_agg(report_id) from public.reports where title='M-48 Fictional Report'),'[]'::jsonb)
))->>'episodeId')::uuid;

update m48_test set asset_id=(public.request_podcast_media_upload(episode_id,'audio','audio/mpeg',1024,'fictional.mp3')->>'asset_id')::uuid;
select public.finalize_podcast_media_upload(asset_id,120,'m48-test-sha') from m48_test;

do $$ declare v jsonb; begin
  v:=public.podcast_admin_workspace((select episode_id from m48_test));
  if v->>'transcript' not like '[00:00]%' or jsonb_array_length(v->'tagIds')<>1 or jsonb_array_length(v->'storyIds')<>1 or jsonb_array_length(v->'resourceIds')<>1 or jsonb_array_length(v->'reportIds')<>1 then raise exception 'workspace or relationships failed: %',v; end if;
  v:=public.podcast_admin_dashboard(); if (v->>'drafts')::int<1 or (v->>'transcriptComplete')::int<1 then raise exception 'dashboard failed: %',v; end if;
  v:=public.podcast_admin_list(jsonb_build_object('q','Fictional','transcriptComplete',true)); if (v->>'total')::int<1 then raise exception 'list filters failed: %',v; end if;
end $$;

select public.podcast_admin_transition((select episode_id from m48_test),'schedule',now()+interval '1 day');
do $$ begin if not exists(select 1 from public.podcast_episodes where episode_id=(select episode_id from m48_test) and status='scheduled' and scheduled_at is not null) then raise exception 'schedule failed'; end if; end $$;
reset role;
update public.podcast_episodes set scheduled_at=now()-interval '1 minute' where episode_id=(select episode_id from m48_test);
do $$ begin
  if public.publish_scheduled_podcast_episodes()<>1 then raise exception 'scheduled publisher did not publish exactly one episode'; end if;
  if not exists(select 1 from public.podcast_episodes_public where slug='m48-fictional-episode') then raise exception 'scheduled publication was not public'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000058';
select public.podcast_admin_transition((select episode_id from m48_test),'unpublish',null);
select public.podcast_admin_transition((select episode_id from m48_test),'publish',null);
reset role;
do $$ begin if not exists(select 1 from public.podcast_episodes_public where slug='m48-fictional-episode') then raise exception 'public publication failed'; end if; end $$;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000058';
do $$ declare v jsonb; begin
  v:=public.podcast_admin_bulk(array[(select episode_id from m48_test)],'feature'); if (v->>'updated')::int<>1 then raise exception 'feature bulk failed: %',v; end if;
  v:=public.podcast_admin_bulk(array[(select episode_id from m48_test)],'feature'); if (v->>'already')::int<>1 then raise exception 'bulk already failed: %',v; end if;
end $$;
select public.podcast_admin_transition((select episode_id from m48_test),'archive',null);
select public.podcast_admin_transition((select episode_id from m48_test),'restore',null);
reset role;

do $$ declare v_id text:=(select episode_id::text from m48_test); begin
  if not exists(select 1 from audit.audit_log where entity_id=v_id and action='podcast.revision' and metadata->>'operation'='publish' and metadata->'changes'->'status'->>'after'='published') then raise exception 'revision audit failed'; end if;
  if exists(select 1 from audit.audit_log where entity_id=v_id and metadata::text like '%Private fictional editorial note%' or metadata::text like '%fictional transcript%') then raise exception 'sensitive audit leakage'; end if;
  if not exists(select 1 from audit.audit_log where action='podcast.bulk.summary' and (metadata->>'already')::int=1) then raise exception 'bulk audit failed'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000059';
do $$ begin perform public.podcast_admin_dashboard(); raise exception 'unauthorized dashboard succeeded'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.podcast_admin_save(null,jsonb_build_object('title','Denied')); raise exception 'unauthorized save succeeded'; exception when insufficient_privilege then null; end $$;
rollback;
select 'M-48 podcast editorial behavior: PASS' result;
