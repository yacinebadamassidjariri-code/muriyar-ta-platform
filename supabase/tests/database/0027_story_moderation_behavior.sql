\set ON_ERROR_STOP on

begin;

select vault.create_secret('m47-disposable-encryption-key', 'story_body_key');

insert into auth.users(id,aud,role,email,created_at,updated_at) values
  ('10000000-0000-4000-8000-000000000047','authenticated','authenticated','m47-editor@example.invalid',now(),now()),
  ('10000000-0000-4000-8000-000000000048','authenticated','authenticated','m47-moderator@example.invalid',now(),now()),
  ('10000000-0000-4000-8000-000000000049','authenticated','authenticated','m47-unauthorized@example.invalid',now(),now());
insert into public.users(user_id,email,display_name) values
  ('10000000-0000-4000-8000-000000000047','m47-editor@example.invalid','M-47 Editor'),
  ('10000000-0000-4000-8000-000000000048','m47-moderator@example.invalid','M-47 Moderator'),
  ('10000000-0000-4000-8000-000000000049','m47-unauthorized@example.invalid','M-47 Unauthorized');
insert into public.user_role_assignments(user_id,role_id)
select '10000000-0000-4000-8000-000000000047',role_id from public.roles where name='managing_editor';
insert into public.user_role_assignments(user_id,role_id)
select '10000000-0000-4000-8000-000000000048',role_id from public.roles where name='moderator';
insert into public.user_role_assignments(user_id,role_id)
select '10000000-0000-4000-8000-000000000049',role_id from public.roles where name='translator';

create temporary table m47_test(submission_id uuid primary key, kind text not null);

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000047';
select public.submit_story(
  'This is a fictional and non-sensitive story used only to validate the complete editorial moderation workflow safely.',
  'en',true,'en','Testland','Broad Test Region'
);
select public.submit_story(
  'This second fictional and non-sensitive story exists only to validate rejection and retention protections safely.',
  'fr',true,'fr',null,null
);
reset role;

insert into m47_test
select submission_id,case when language_code='en' then 'publish' else 'reject' end
from public.raw_submissions
where submission_timestamp >= transaction_timestamp();
grant select on m47_test to authenticated;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000047';

do $$ declare v_counts jsonb; begin
  select jsonb_object_agg(state,total) into v_counts from public.story_admin_dashboard();
  if (v_counts->>'PENDING')::integer < 2 then raise exception 'dashboard pending count failed'; end if;
  if (select count(*) from public.story_admin_queue(null,null,null,null,null,false,null,null,null,'submitted_desc',1,25)) < 2 then raise exception 'queue failed'; end if;
end $$;

select public.story_admin_assign((select submission_id from m47_test where kind='publish'),'10000000-0000-4000-8000-000000000048');

set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000048';
do $$ declare v_workspace jsonb; begin
  v_workspace:=public.story_admin_workspace((select submission_id from m47_test where kind='publish'));
  if v_workspace->'submission'->>'body' not like 'This is a fictional%' then raise exception 'assigned review body failed'; end if;
  if v_workspace->'submission' ? 'contact_email' or v_workspace->'submission' ? 'consent_given' then raise exception 'private field leaked'; end if;
end $$;
select public.story_admin_save_review(
  (select submission_id from m47_test where kind='publish'),
  'medium',array['child_protection','requires_escalation'],'Private fictional test note'
);

do $$ begin
  perform public.story_admin_save_draft((select submission_id from m47_test where kind='publish'),'{}'::jsonb);
  raise exception 'moderator unexpectedly edited publication draft';
exception when insufficient_privilege then null; end $$;

set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000047';
select public.story_admin_save_draft((select submission_id from m47_test where kind='publish'),jsonb_build_object(
  'title','A Fictional M-47 Story',
  'body','This is the de-identified fictional publication copy. It contains no real person, location, or sensitive event details.',
  'excerpt','A harmless validation excerpt.',
  'featured_quote','A fictional quote for validation.',
  'category_tag_id',(select tag_id from public.issue_tags order by tag_id limit 1),
  'tag_ids',(select jsonb_agg(tag_id) from (select tag_id from public.issue_tags order by tag_id limit 2) tags),
  'related_podcast_ids','[]'::jsonb,
  'related_report_ids','[]'::jsonb
));
select public.story_admin_transition((select submission_id from m47_test where kind='publish'),'approve',null,'Approved in disposable validation');
select public.story_admin_transition((select submission_id from m47_test where kind='publish'),'publish',null,'Published in disposable validation');

reset role;
do $$ declare v_id uuid:=(select submission_id from m47_test where kind='publish'); begin
  if not exists(select 1 from public.published_stories_public where slug='a-fictional-m-47-story') then raise exception 'published story missing publicly'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='published_stories_public' and column_name in ('source_submission_ref','unpublished_at','archived_at')) then raise exception 'private columns leaked publicly'; end if;
  if (select current_state<>'PUBLISHED' from public.raw_submissions where submission_id=v_id) then raise exception 'publish state failed'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000047';
select public.story_admin_transition((select submission_id from m47_test where kind='publish'),'unpublish',null,null);
do $$ begin if exists(select 1 from public.published_stories_public where slug='a-fictional-m-47-story') then raise exception 'unpublished story leaked'; end if; end $$;
select public.story_admin_transition((select submission_id from m47_test where kind='publish'),'archive',null,null);
select public.story_admin_transition((select submission_id from m47_test where kind='publish'),'restore',null,null);

select public.story_admin_assign((select submission_id from m47_test where kind='reject'),'10000000-0000-4000-8000-000000000047');
select public.story_admin_transition((select submission_id from m47_test where kind='reject'),'reject','R-03','Disposable rejection test');
reset role;
do $$ begin
  if not exists(select 1 from public.raw_submissions where submission_id=(select submission_id from m47_test where kind='reject') and current_state='REJECTED' and scheduled_purge_at is not null) then raise exception 'rejection retention failed'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000047';
do $$ declare v_result jsonb; begin
  v_result:=public.story_admin_bulk(array[(select submission_id from m47_test where kind='reject')],'reject',null,'R-03');
  if (v_result->>'already')::integer<>1 then raise exception 'structured bulk no-op failed: %',v_result; end if;
end $$;

reset role;
do $$ declare v_id text:=(select submission_id::text from m47_test where kind='publish'); begin
  if not exists(select 1 from audit.audit_log where entity_id=v_id and action='story.revision' and metadata->>'operation'='publish' and metadata->'changes'->'state'->>'after'='PUBLISHED') then raise exception 'publish before/after audit missing'; end if;
  if exists(select 1 from audit.audit_log where entity_id=v_id and metadata::text like '%de-identified fictional publication copy%') then raise exception 'story body leaked to audit'; end if;
  if not exists(select 1 from audit.audit_log where action='story.bulk.summary' and (metadata->>'already')::integer=1) then raise exception 'bulk summary audit missing'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000049';
do $$ begin
  perform public.story_admin_dashboard();
  raise exception 'unauthorized dashboard unexpectedly succeeded';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.story_admin_assign((select submission_id from m47_test limit 1),auth.uid());
  raise exception 'unauthorized assignment unexpectedly succeeded';
exception when insufficient_privilege then null; end $$;

rollback;
select 'M-47 story moderation behavior: PASS' as result;
