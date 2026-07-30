-- =====================================================================
-- Migration 0020 — Resource category assignments and editorial priority
--
-- Adds multi-category support for resources while preserving the existing
-- resources.category_id compatibility field and public Resources API shape.
--
-- Rollback, if validation fails before release:
--   1) Restore resources_public to the 0007 shape.
--   2) Drop resource_category_assignments.
--   3) Drop resources.editorial_priority.
--   4) Drop type resource_editorial_priority if no longer referenced.
--   5) Delete the two new category rows only if no remaining data depends on
--      them. Because resources.category_id is preserved, the old single-category
--      read path remains available throughout.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Controlled editorial priority vocabulary.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'resource_editorial_priority'
  ) then
    create type public.resource_editorial_priority as enum
      ('high', 'medium', 'low');
  end if;
end $$;

alter table public.resources
  add column if not exists editorial_priority public.resource_editorial_priority;


-- ---------------------------------------------------------------------
-- 2) Missing first-class categories.
-- ---------------------------------------------------------------------
insert into public.resource_categories (name, sort_order) values
  ('Child Marriage Support', 5),
  ('Find Local Organizations', 0)
on conflict (name) do nothing;


-- ---------------------------------------------------------------------
-- 3) Multi-category assignment table.
--    resources.category_id remains the intentional compatibility category.
-- ---------------------------------------------------------------------
create table if not exists public.resource_category_assignments (
  resource_id  uuid not null references public.resources(resource_id) on delete cascade,
  category_id  integer not null references public.resource_categories(category_id),
  created_at   timestamptz not null default now(),
  primary key (resource_id, category_id)
);

create index if not exists rca_category_idx
  on public.resource_category_assignments (category_id);

create index if not exists rca_resource_idx
  on public.resource_category_assignments (resource_id);

alter table public.resource_category_assignments enable row level security;

grant select on public.resource_category_assignments to anon, authenticated;
grant insert, update, delete on public.resource_category_assignments to authenticated;

drop policy if exists rca_read_all on public.resource_category_assignments;
create policy rca_read_all on public.resource_category_assignments
  for select to anon, authenticated using (true);

drop policy if exists rca_editor on public.resource_category_assignments;
create policy rca_editor on public.resource_category_assignments
  for all to authenticated
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

-- Backfill every existing resource's compatibility category into the new table.
insert into public.resource_category_assignments (resource_id, category_id)
select resource_id, category_id
from public.resources
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 4) Public view remains the frontend contract.
--    The join table stays hidden behind category_ids.
-- ---------------------------------------------------------------------
create or replace view public.resources_public
  with (security_invoker = on) as
select
  r.resource_id,
  r.name,
  r.description,
  r.category_id,
  r.website_url,
  r.contact_phone,
  r.contact_email,
  r.languages_supported,
  r.geographic_region_id,
  r.is_crisis_resource,
  r.last_verified_date,
  r.editorial_priority,
  coalesce(
    (
      select array_agg(rca.category_id order by rc.sort_order, rc.name)
      from public.resource_category_assignments rca
      join public.resource_categories rc on rc.category_id = rca.category_id
      where rca.resource_id = r.resource_id
    ),
    array[r.category_id]
  ) as category_ids
from public.resources r
where r.status = 'active';

grant select on public.resources_public to anon, authenticated;
