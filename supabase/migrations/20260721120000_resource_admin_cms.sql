-- M-46 — Resource administration CMS.
--
-- The public resources_public and crisis_resources_public view contracts are
-- intentionally unchanged. `active` remains the stored published state so
-- existing public readers continue to behave exactly as before.

alter type public.resource_status add value if not exists 'draft' before 'active';

begin;

alter table public.resources
  add column if not exists address text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists internal_notes text,
  add column if not exists published_at timestamptz,
  add column if not exists unpublished_at timestamptz,
  add column if not exists updated_by uuid references public.users(user_id) on delete set null;

alter table public.resources
  drop constraint if exists resources_social_links_object,
  add constraint resources_social_links_object
    check (jsonb_typeof(social_links) = 'object'),
  drop constraint if exists resources_sort_order_range,
  add constraint resources_sort_order_range
    check (sort_order between -100000 and 100000);

update public.resources
set published_at = coalesce(published_at, created_at)
where status = 'active' and published_at is null;

create table if not exists public.resource_geographic_assignments (
  resource_id uuid not null references public.resources(resource_id) on delete cascade,
  region_id integer not null references public.geographic_regions(region_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (resource_id, region_id)
);

create index if not exists rga_region_idx
  on public.resource_geographic_assignments(region_id, resource_id);
create index if not exists resources_admin_updated_idx
  on public.resources(updated_at desc, resource_id);
create index if not exists resources_admin_priority_idx
  on public.resources(editorial_priority, status);

insert into public.resource_geographic_assignments(resource_id, region_id)
select resource_id, geographic_region_id
from public.resources
where geographic_region_id is not null
on conflict do nothing;

alter table public.resource_geographic_assignments enable row level security;
grant select on public.resource_geographic_assignments to authenticated;
revoke insert, update, delete on public.resource_geographic_assignments from authenticated;

drop policy if exists rga_capability_read on public.resource_geographic_assignments;
create policy rga_capability_read on public.resource_geographic_assignments
  for select to authenticated using (
    (select public.has_permission('resource.edit'))
    or (select public.has_permission('resource.verify'))
    or (select public.has_permission('resource.import'))
  );

-- Narrow RPCs are the only authenticated write path.
revoke insert, update, delete on public.resources from authenticated;
revoke insert, update, delete on public.resource_category_assignments from authenticated;

create or replace function public.resource_compatibility_category(p_ids integer[])
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select c.category_id
  from public.resource_categories c
  where c.category_id = any(coalesce(p_ids, array[]::integer[]))
  order by
    case lower(regexp_replace(c.name, '[^a-z0-9]+', '-', 'g'))
      when 'find-local-organizations' then 1
      when 'helplines-crisis-support' then 2
      when 'child-marriage-support' then 3
      when 'gbv-support-services' then 4
      when 'gender-based-violence-support-services' then 5
      when 'gender-based-violence-support' then 6
      when 'mental-health-support' then 7
      when 'legal-support' then 8
      when 'education-scholarships' then 9
      when 'health-services' then 10
      when 'ngos-organizations' then 11
      else 100
    end,
    c.sort_order,
    c.name,
    c.category_id
  limit 1;
$$;

create or replace function public.resource_admin_save(
  p_resource_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid := coalesce(p_resource_id, gen_random_uuid());
  v_existing public.resources%rowtype;
  v_name text := nullif(btrim(p_payload->>'name'), '');
  v_description text := nullif(btrim(p_payload->>'description'), '');
  v_website text := nullif(btrim(p_payload->>'website_url'), '');
  v_phone text := nullif(btrim(p_payload->>'contact_phone'), '');
  v_email text := nullif(lower(btrim(p_payload->>'contact_email')), '');
  v_address text := nullif(btrim(p_payload->>'address'), '');
  v_notes text := nullif(btrim(p_payload->>'internal_notes'), '');
  v_social jsonb := coalesce(p_payload->'social_links', '{}'::jsonb);
  v_categories integer[];
  v_regions integer[];
  v_languages text[];
  v_primary_category integer;
  v_primary_region integer;
  v_changed text[];
  v_before jsonb;
  v_after jsonb;
  v_created boolean := p_resource_id is null;
begin
  if not public.has_permission('resource.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_name is null or char_length(v_name) > 200 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_description is not null and char_length(v_description) > 10000
     or v_phone is not null and char_length(v_phone) > 60
     or v_email is not null and char_length(v_email) > 200
     or v_address is not null and char_length(v_address) > 1000
     or v_notes is not null and char_length(v_notes) > 5000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_website is not null and (char_length(v_website) > 500 or v_website !~* '^https?://[^[:space:]]+$') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if jsonb_typeof(v_social) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct value::integer order by value::integer), array[]::integer[])
  into v_categories
  from jsonb_array_elements_text(coalesce(p_payload->'category_ids', '[]'::jsonb));
  if cardinality(v_categories) = 0
     or (select count(*) from public.resource_categories where category_id = any(v_categories)) <> cardinality(v_categories) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  v_primary_category := public.resource_compatibility_category(v_categories);

  select coalesce(array_agg(distinct value::integer order by value::integer), array[]::integer[])
  into v_regions
  from jsonb_array_elements_text(coalesce(p_payload->'region_ids', '[]'::jsonb));
  if cardinality(v_regions) > 0
     and (select count(*) from public.geographic_regions where region_id = any(v_regions)) <> cardinality(v_regions) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select region_id into v_primary_region
  from public.geographic_regions
  where region_id = any(v_regions)
  order by case level::text
      when 'global' then 1 when 'country' then 2
      when 'subregion' then 3 when 'continent' then 4 else 5 end,
    name, region_id
  limit 1;

  select coalesce(array_agg(distinct value order by value), array[]::text[])
  into v_languages
  from jsonb_array_elements_text(coalesce(p_payload->'language_codes', '[]'::jsonb));
  if cardinality(v_languages) > 0 and (
    select count(*) from public.supported_languages
    where language_code = any(v_languages) and is_active
  ) <> cardinality(v_languages) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.resources r
    where r.resource_id <> v_id
      and lower(regexp_replace(r.name, '[^a-z0-9]+', '', 'g')) =
          lower(regexp_replace(v_name, '[^a-z0-9]+', '', 'g'))
  ) then
    raise exception 'conflict' using errcode = '23505';
  end if;
  if v_website is not null and exists (
    select 1 from public.resources r
    where r.resource_id <> v_id and r.website_url is not null
      and lower(regexp_replace(rtrim(r.website_url, '/'), '^https?://(www\.)?', '')) =
          lower(regexp_replace(rtrim(v_website, '/'), '^https?://(www\.)?', ''))
  ) then
    raise exception 'conflict' using errcode = '23505';
  end if;

  if not v_created then
    select * into v_existing from public.resources where resource_id = v_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    v_before := jsonb_build_object(
      'name', v_existing.name, 'description', v_existing.description,
      'website_url', v_existing.website_url, 'contact_phone', v_existing.contact_phone,
      'contact_email', v_existing.contact_email, 'address', v_existing.address,
      'social_links', v_existing.social_links, 'languages_supported', v_existing.languages_supported,
      'geographic_region_id', v_existing.geographic_region_id,
      'is_crisis_resource', v_existing.is_crisis_resource,
      'editorial_priority', v_existing.editorial_priority,
      'is_featured', v_existing.is_featured, 'sort_order', v_existing.sort_order,
      'internal_notes', v_existing.internal_notes,
      'category_ids', (select coalesce(jsonb_agg(category_id order by category_id), '[]'::jsonb) from public.resource_category_assignments where resource_id = v_id),
      'region_ids', (select coalesce(jsonb_agg(region_id order by region_id), '[]'::jsonb) from public.resource_geographic_assignments where resource_id = v_id)
    );
  end if;

  insert into public.resources(
    resource_id, name, description, category_id, website_url, contact_phone,
    contact_email, address, social_links, languages_supported,
    geographic_region_id, is_crisis_resource, editorial_priority, is_featured,
    sort_order, internal_notes, status, published_at, updated_by
  ) values (
    v_id, v_name, v_description, v_primary_category, v_website, v_phone,
    v_email, v_address, v_social, to_jsonb(v_languages), v_primary_region,
    coalesce((p_payload->>'is_crisis_resource')::boolean, false),
    nullif(p_payload->>'editorial_priority', '')::public.resource_editorial_priority,
    coalesce((p_payload->>'is_featured')::boolean, false),
    coalesce((p_payload->>'sort_order')::integer, 0), v_notes,
    'draft'::public.resource_status, null, auth.uid()
  )
  on conflict (resource_id) do update set
    name = excluded.name, description = excluded.description,
    category_id = excluded.category_id, website_url = excluded.website_url,
    contact_phone = excluded.contact_phone, contact_email = excluded.contact_email,
    address = excluded.address, social_links = excluded.social_links,
    languages_supported = excluded.languages_supported,
    geographic_region_id = excluded.geographic_region_id,
    is_crisis_resource = excluded.is_crisis_resource,
    editorial_priority = excluded.editorial_priority,
    is_featured = excluded.is_featured, sort_order = excluded.sort_order,
    internal_notes = excluded.internal_notes, updated_by = auth.uid();

  delete from public.resource_category_assignments where resource_id = v_id;
  insert into public.resource_category_assignments(resource_id, category_id)
  select v_id, unnest(v_categories);
  delete from public.resource_geographic_assignments where resource_id = v_id;
  insert into public.resource_geographic_assignments(resource_id, region_id)
  select v_id, unnest(v_regions);

  select jsonb_build_object(
    'name', r.name, 'description', r.description, 'website_url', r.website_url,
    'contact_phone', r.contact_phone, 'contact_email', r.contact_email,
    'address', r.address, 'social_links', r.social_links,
    'languages_supported', r.languages_supported,
    'geographic_region_id', r.geographic_region_id,
    'is_crisis_resource', r.is_crisis_resource,
    'editorial_priority', r.editorial_priority, 'is_featured', r.is_featured,
    'sort_order', r.sort_order, 'internal_notes', r.internal_notes,
    'category_ids', to_jsonb(v_categories), 'region_ids', to_jsonb(v_regions)
  ) into v_after from public.resources r where r.resource_id = v_id;

  if v_created then
    v_changed := array(select jsonb_object_keys(v_after));
  else
    select coalesce(array_agg(key order by key), array[]::text[]) into v_changed
    from jsonb_each(v_after) n
    where v_before->n.key is distinct from n.value;
  end if;
  perform audit.write_event(
    case when v_created then 'resource.created' else 'resource.updated' end,
    'resource', v_id::text,
    jsonb_build_object('changed_fields', to_jsonb(v_changed))
  );
  return v_id;
exception
  when invalid_text_representation or numeric_value_out_of_range or check_violation then
    raise exception 'invalid_input' using errcode = '22023';
end;
$$;

create or replace function public.resource_admin_transition(
  p_resource_id uuid,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_status public.resource_status;
begin
  if not public.has_permission('resource.verify') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('publish', 'unpublish', 'archive', 'restore') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.resources set
    status = case p_action
      when 'publish' then 'active'::public.resource_status
      when 'archive' then 'archived'::public.resource_status
      else 'draft'::public.resource_status end,
    published_at = case when p_action = 'publish' then coalesce(published_at, now()) else published_at end,
    unpublished_at = case when p_action = 'unpublish' then now() when p_action = 'publish' then null else unpublished_at end,
    updated_by = auth.uid()
  where resource_id = p_resource_id
  returning status into v_status;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event(
    case p_action
      when 'publish' then 'resource.published'
      when 'unpublish' then 'resource.unpublished'
      when 'archive' then 'resource.archived'
      else 'resource.restored'
    end,
    'resource', p_resource_id::text,
    jsonb_build_object('changed_fields', jsonb_build_array('status', 'published_at', 'unpublished_at'))
  );
  return case when v_status = 'active' then 'published' else v_status::text end;
end;
$$;

create or replace function public.resource_admin_bulk(
  p_resource_ids uuid[],
  p_action text,
  p_category_id integer default null,
  p_priority public.resource_editorial_priority default null
)
returns integer
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
  v_count integer := 0;
  v_categories integer[];
begin
  if cardinality(coalesce(p_resource_ids, array[]::uuid[])) = 0
     or cardinality(p_resource_ids) > 100 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_action in ('publish', 'unpublish', 'archive', 'restore') then
    if not public.has_permission('resource.verify') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  elsif p_action in ('assign_category', 'remove_category', 'change_priority') then
    if not public.has_permission('resource.edit') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_action in ('assign_category', 'remove_category') and not exists (
    select 1 from public.resource_categories where category_id = p_category_id
  ) then raise exception 'invalid_input' using errcode = '22023'; end if;

  foreach v_id in array p_resource_ids loop
    if not exists (select 1 from public.resources where resource_id = v_id for update) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if p_action in ('publish', 'unpublish', 'archive', 'restore') then
      perform public.resource_admin_transition(v_id, p_action);
    elsif p_action = 'assign_category' then
      insert into public.resource_category_assignments(resource_id, category_id)
      values (v_id, p_category_id) on conflict do nothing;
    elsif p_action = 'remove_category' then
      if (select count(*) from public.resource_category_assignments where resource_id = v_id) <= 1
         and exists (select 1 from public.resource_category_assignments where resource_id = v_id and category_id = p_category_id) then
        raise exception 'invalid_input' using errcode = '22023';
      end if;
      delete from public.resource_category_assignments where resource_id = v_id and category_id = p_category_id;
    elsif p_action = 'change_priority' then
      update public.resources set editorial_priority = p_priority, updated_by = auth.uid() where resource_id = v_id;
    end if;
    if p_action in ('assign_category', 'remove_category') then
      select array_agg(category_id order by category_id) into v_categories
      from public.resource_category_assignments where resource_id = v_id;
      update public.resources set category_id = public.resource_compatibility_category(v_categories), updated_by = auth.uid()
      where resource_id = v_id;
    end if;
    if p_action not in ('publish', 'unpublish', 'archive', 'restore') then
      perform audit.write_event(
        'resource.bulk.' || p_action, 'resource', v_id::text,
        jsonb_build_object(
          'changed_fields', case when p_action = 'change_priority'
            then jsonb_build_array('editorial_priority') else jsonb_build_array('category_ids') end,
          'category_id', p_category_id, 'priority', p_priority
        )
      );
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.resource_compatibility_category(integer[]),
  public.resource_admin_save(uuid, jsonb),
  public.resource_admin_transition(uuid, text),
  public.resource_admin_bulk(uuid[], text, integer, public.resource_editorial_priority)
  from public, anon, authenticated;
grant execute on function public.resource_admin_save(uuid, jsonb),
  public.resource_admin_transition(uuid, text),
  public.resource_admin_bulk(uuid[], text, integer, public.resource_editorial_priority)
  to authenticated;

commit;
