\set ON_ERROR_STOP on

begin;

insert into auth.users(id, aud, role, email, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000046', 'authenticated', 'authenticated', 'm46-editor@example.invalid', now(), now()),
  ('10000000-0000-4000-8000-000000000047', 'authenticated', 'authenticated', 'm46-unauthorized@example.invalid', now(), now());
insert into public.users(user_id, email, display_name)
values
  ('10000000-0000-4000-8000-000000000046', 'm46-editor@example.invalid', 'M-46 Editor'),
  ('10000000-0000-4000-8000-000000000047', 'm46-unauthorized@example.invalid', 'M-46 Unauthorized');
insert into public.user_role_assignments(user_id, role_id)
select '10000000-0000-4000-8000-000000000046', role_id from public.roles where name = 'resource_editor';
insert into public.user_role_assignments(user_id, role_id)
select '10000000-0000-4000-8000-000000000047', role_id from public.roles where name = 'translator';

create temporary table m46_test(resource_id uuid primary key);
grant select, insert on m46_test to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000046';

insert into m46_test(resource_id)
select public.resource_admin_save_v2(null, jsonb_build_object(
  'name', 'M-46 Fictional Test Resource',
  'description', 'Harmless disposable validation record.',
  'website_url', 'https://m46.example.invalid/resource',
  'contact_email', 'hello@m46.example.invalid',
  'contact_phone', '+1 555 0100',
  'address', 'Broad context only',
  'social_links', jsonb_build_object('instagram', 'https://instagram.com/m46-test'),
  'category_ids', (select jsonb_agg(category_id order by category_id) from (select category_id from public.resource_categories order by sort_order, name limit 2) c),
  'region_ids', (select jsonb_agg(region_id order by region_id) from (select region_id from public.geographic_regions order by region_id limit 2) g),
  'language_codes', jsonb_build_array('en', 'fr'),
  'is_crisis_resource', false,
  'editorial_priority', 'high',
  'is_featured', true,
  'sort_order', 7,
  'internal_notes', 'Disposable internal note'
));

do $$
declare v_id uuid := (select resource_id from m46_test);
begin
  if (select status <> 'draft' from public.resources where resource_id = v_id) then raise exception 'new resource is not draft'; end if;
  if (select count(*) <> 2 from public.resource_category_assignments where resource_id = v_id) then raise exception 'multi-category save failed'; end if;
  if (select count(*) <> 2 from public.resource_geographic_assignments where resource_id = v_id) then raise exception 'multi-geography save failed'; end if;
  if (select languages_supported <> '["en", "fr"]'::jsonb from public.resources where resource_id = v_id) then raise exception 'language save failed'; end if;
  if exists (select 1 from public.resources_public where resource_id = v_id) then raise exception 'draft leaked publicly'; end if;
end $$;

select public.resource_admin_transition_v2((select resource_id from m46_test), 'publish');

do $$
declare v_id uuid := (select resource_id from m46_test);
begin
  if not exists (select 1 from public.resources_public where resource_id = v_id) then raise exception 'published resource missing publicly'; end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resources_public'
      and column_name in ('internal_notes', 'address', 'social_links', 'updated_by')
  ) then raise exception 'private admin fields exposed by public view'; end if;
end $$;

select public.resource_admin_bulk_v2(array[(select resource_id from m46_test)], 'change_priority', null, 'medium');
select public.resource_admin_bulk_v2(array[(select resource_id from m46_test)], 'unpublish', null, null);
select public.resource_admin_bulk_v2(array[(select resource_id from m46_test)], 'archive', null, null);

do $$
declare v_result jsonb;
begin
  v_result := public.resource_admin_bulk_v2(array[(select resource_id from m46_test)], 'archive', null, null);
  if v_result <> '{"requested": 1, "updated": 0, "skipped": 0, "already": 1}'::jsonb then
    raise exception 'structured no-op result is incorrect: %', v_result;
  end if;
end $$;

select public.resource_admin_bulk_v2(array[(select resource_id from m46_test)], 'restore', null, null);

do $$
declare v_id uuid := (select resource_id from m46_test);
begin
  if (select status <> 'draft' or editorial_priority <> 'medium' from public.resources where resource_id = v_id) then raise exception 'bulk transition failed'; end if;
end $$;

reset role;

do $$
declare v_id text := (select resource_id::text from m46_test);
begin
  if not exists (select 1 from audit.audit_log where entity_id = v_id and action = 'resource.created') then raise exception 'create audit missing'; end if;
  if not exists (select 1 from audit.audit_log where entity_id = v_id and action = 'resource.published') then raise exception 'publish audit missing'; end if;
  if not exists (select 1 from audit.audit_log where entity_id = v_id and action = 'resource.bulk.change_priority') then raise exception 'bulk audit missing'; end if;
  if not exists (
    select 1 from audit.audit_log
    where entity_id = v_id and action = 'resource.revision'
      and metadata->'changes'->'name'->>'after' = 'M-46 Fictional Test Resource'
      and metadata->'changes'->'contact_email'->>'after' = '[redacted]'
  ) then raise exception 'revision-ready create audit missing'; end if;
  if not exists (
    select 1 from audit.audit_log
    where entity_id = v_id and action = 'resource.revision'
      and metadata->>'operation' = 'publish'
      and metadata->'changes'->'status'->>'before' = 'draft'
      and metadata->'changes'->'status'->>'after' = 'published'
  ) then raise exception 'transition before/after audit missing'; end if;
  if not exists (
    select 1 from audit.audit_log
    where action = 'resource.bulk.summary' and metadata->>'action' = 'archive'
      and (metadata->>'already')::integer = 1
  ) then raise exception 'bulk summary audit missing'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000047';
do $$
begin
  perform public.resource_admin_transition_v2((select resource_id from m46_test), 'publish');
  raise exception 'unauthorized transition unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;

rollback;

select 'M-46 resource administration behavior: PASS' as result;
