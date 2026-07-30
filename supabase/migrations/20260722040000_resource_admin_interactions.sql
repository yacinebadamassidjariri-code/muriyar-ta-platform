-- M-46 refinement — structured bulk outcomes and revision-ready audit metadata.
--
-- The accepted M-46 RPCs remain as internal compatibility implementations.
-- Authenticated callers use the v2 wrappers below so every successful change
-- also receives a field-level before/after revision event.

begin;

create or replace function public.resource_admin_snapshot(p_resource_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', r.name,
    'description', r.description,
    'website_url', r.website_url,
    'contact_phone', r.contact_phone,
    'contact_email', r.contact_email,
    'address', r.address,
    'social_links', r.social_links,
    'category_ids', (
      select coalesce(jsonb_agg(a.category_id order by a.category_id), '[]'::jsonb)
      from public.resource_category_assignments a
      where a.resource_id = r.resource_id
    ),
    'region_ids', (
      select coalesce(jsonb_agg(a.region_id order by a.region_id), '[]'::jsonb)
      from public.resource_geographic_assignments a
      where a.resource_id = r.resource_id
    ),
    'language_codes', coalesce(r.languages_supported, '[]'::jsonb),
    'is_crisis_resource', r.is_crisis_resource,
    'editorial_priority', r.editorial_priority,
    'is_featured', r.is_featured,
    'sort_order', r.sort_order,
    'internal_notes', r.internal_notes,
    'status', case when r.status = 'active' then 'published' else r.status::text end,
    'published_at', r.published_at,
    'unpublished_at', r.unpublished_at
  )
  from public.resources r
  where r.resource_id = p_resource_id;
$$;

create or replace function public.resource_admin_revision_changes(
  p_before jsonb,
  p_after jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_key text;
  v_before_value jsonb;
  v_after_value jsonb;
  v_changes jsonb := '{}'::jsonb;
begin
  p_before := coalesce(p_before, '{}'::jsonb);
  p_after := coalesce(p_after, '{}'::jsonb);
  for v_key in
    select key from (
      select jsonb_object_keys(p_before) as key
      union
      select jsonb_object_keys(p_after) as key
    ) keys
    order by key
  loop
    if p_before->v_key is distinct from p_after->v_key then
      if v_key in ('contact_email', 'internal_notes') then
        v_before_value := case when p_before->v_key is null or p_before->v_key = 'null'::jsonb
          then 'null'::jsonb else '"[redacted]"'::jsonb end;
        v_after_value := case when p_after->v_key is null or p_after->v_key = 'null'::jsonb
          then 'null'::jsonb else '"[redacted]"'::jsonb end;
      else
        v_before_value := coalesce(p_before->v_key, 'null'::jsonb);
        v_after_value := coalesce(p_after->v_key, 'null'::jsonb);
      end if;
      v_changes := v_changes || jsonb_build_object(
        v_key,
        jsonb_build_object('before', v_before_value, 'after', v_after_value)
      );
    end if;
  end loop;
  return v_changes;
end;
$$;

create or replace function public.resource_admin_write_revision(
  p_resource_id uuid,
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
declare
  v_changes jsonb := public.resource_admin_revision_changes(p_before, p_after);
  v_changed_fields jsonb;
begin
  if v_changes = '{}'::jsonb then return; end if;
  select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
  into v_changed_fields
  from jsonb_object_keys(v_changes) keys(key);
  perform audit.write_event(
    'resource.revision',
    'resource',
    p_resource_id::text,
    jsonb_build_object(
      'operation', p_operation,
      'changed_fields', v_changed_fields,
      'changes', v_changes,
      'context', coalesce(p_context, '{}'::jsonb)
    )
  );
end;
$$;

create or replace function public.resource_admin_save_v2(
  p_resource_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if not public.has_permission('resource.edit') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_resource_id is not null then
    v_before := public.resource_admin_snapshot(p_resource_id);
  end if;
  v_id := public.resource_admin_save(p_resource_id, p_payload);
  v_after := public.resource_admin_snapshot(v_id);
  perform public.resource_admin_write_revision(
    v_id,
    case when p_resource_id is null then 'create' else 'update' end,
    v_before,
    v_after
  );
  return v_id;
end;
$$;

create or replace function public.resource_admin_transition_v2(
  p_resource_id uuid,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_status text;
begin
  if not public.has_permission('resource.verify') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_before := public.resource_admin_snapshot(p_resource_id);
  if v_before is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_status := public.resource_admin_transition(p_resource_id, p_action);
  v_after := public.resource_admin_snapshot(p_resource_id);
  perform public.resource_admin_write_revision(
    p_resource_id, p_action, v_before, v_after
  );
  return v_status;
end;
$$;

create or replace function public.resource_admin_bulk_v2(
  p_resource_ids uuid[],
  p_action text,
  p_category_id integer default null,
  p_priority public.resource_editorial_priority default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_id uuid;
  v_status public.resource_status;
  v_current_priority public.resource_editorial_priority;
  v_category_count integer;
  v_before jsonb;
  v_after jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_updated integer := 0;
  v_skipped integer := 0;
  v_already integer := 0;
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
  ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  foreach v_id in array p_resource_ids loop
    select status, editorial_priority
    into v_status, v_current_priority
    from public.resources
    where resource_id = v_id
    for update;
    if not found then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if p_action = 'publish' then
      if v_status = 'active' then v_already := v_already + 1;
      else perform public.resource_admin_transition_v2(v_id, p_action); v_updated := v_updated + 1;
      end if;
    elsif p_action = 'unpublish' then
      if v_status = 'draft' then v_already := v_already + 1;
      elsif v_status = 'archived' then v_skipped := v_skipped + 1;
      else perform public.resource_admin_transition_v2(v_id, p_action); v_updated := v_updated + 1;
      end if;
    elsif p_action = 'archive' then
      if v_status = 'archived' then v_already := v_already + 1;
      else perform public.resource_admin_transition_v2(v_id, p_action); v_updated := v_updated + 1;
      end if;
    elsif p_action = 'restore' then
      if v_status = 'draft' then v_already := v_already + 1;
      elsif v_status = 'active' then v_skipped := v_skipped + 1;
      else perform public.resource_admin_transition_v2(v_id, p_action); v_updated := v_updated + 1;
      end if;
    elsif p_action = 'assign_category' then
      if exists (
        select 1 from public.resource_category_assignments
        where resource_id = v_id and category_id = p_category_id
      ) then
        v_already := v_already + 1;
      else
        v_before := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_bulk(array[v_id], p_action, p_category_id, null);
        v_after := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_write_revision(
          v_id, p_action, v_before, v_after,
          jsonb_build_object('bulk', true, 'batch_id', v_batch_id)
        );
        v_updated := v_updated + 1;
      end if;
    elsif p_action = 'remove_category' then
      select count(*) into v_category_count
      from public.resource_category_assignments where resource_id = v_id;
      if not exists (
        select 1 from public.resource_category_assignments
        where resource_id = v_id and category_id = p_category_id
      ) then
        v_already := v_already + 1;
      elsif v_category_count <= 1 then
        v_skipped := v_skipped + 1;
      else
        v_before := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_bulk(array[v_id], p_action, p_category_id, null);
        v_after := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_write_revision(
          v_id, p_action, v_before, v_after,
          jsonb_build_object('bulk', true, 'batch_id', v_batch_id)
        );
        v_updated := v_updated + 1;
      end if;
    else
      if v_current_priority is not distinct from p_priority then
        v_already := v_already + 1;
      else
        v_before := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_bulk(array[v_id], p_action, null, p_priority);
        v_after := public.resource_admin_snapshot(v_id);
        perform public.resource_admin_write_revision(
          v_id, p_action, v_before, v_after,
          jsonb_build_object('bulk', true, 'batch_id', v_batch_id)
        );
        v_updated := v_updated + 1;
      end if;
    end if;
  end loop;

  perform audit.write_event(
    'resource.bulk.summary',
    'resource_bulk',
    v_batch_id::text,
    jsonb_build_object(
      'action', p_action,
      'requested', cardinality(p_resource_ids),
      'updated', v_updated,
      'skipped', v_skipped,
      'already', v_already,
      'category_id', p_category_id,
      'priority', p_priority
    )
  );
  return jsonb_build_object(
    'requested', cardinality(p_resource_ids),
    'updated', v_updated,
    'skipped', v_skipped,
    'already', v_already
  );
end;
$$;

revoke all on function public.resource_admin_snapshot(uuid),
  public.resource_admin_revision_changes(jsonb, jsonb),
  public.resource_admin_write_revision(uuid, text, jsonb, jsonb, jsonb),
  public.resource_admin_save_v2(uuid, jsonb),
  public.resource_admin_transition_v2(uuid, text),
  public.resource_admin_bulk_v2(uuid[], text, integer, public.resource_editorial_priority)
  from public, anon, authenticated;

-- Enforce the revision-aware entry points for all authenticated clients.
revoke execute on function public.resource_admin_save(uuid, jsonb),
  public.resource_admin_transition(uuid, text),
  public.resource_admin_bulk(uuid[], text, integer, public.resource_editorial_priority)
  from authenticated;
grant execute on function public.resource_admin_save_v2(uuid, jsonb),
  public.resource_admin_transition_v2(uuid, text),
  public.resource_admin_bulk_v2(uuid[], text, integer, public.resource_editorial_priority)
  to authenticated;

commit;
