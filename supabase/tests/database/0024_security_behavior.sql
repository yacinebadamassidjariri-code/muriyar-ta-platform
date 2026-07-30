-- Transactional role/RPC privilege checks for a disposable database after
-- migrations and seeds. Fictional Auth and profile rows exist only inside this
-- rolled-back transaction; system foreign-key triggers remain enabled.

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
select user_id::uuid, 'authenticated', 'authenticated', email, now(), now()
from (values
  ('10000000-0000-4000-8000-000000000001', 'phase1-multi@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'phase1-inactive@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'phase1-super@example.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'phase1-editor@example.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'phase1-resource@example.invalid'),
  ('10000000-0000-4000-8000-000000000006', 'phase1-translator@example.invalid'),
  ('10000000-0000-4000-8000-000000000007', 'phase1-researcher@example.invalid')
) fixture(user_id, email);

insert into public.users (user_id, email, display_name, role_id, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'phase1-multi@example.invalid', 'Phase 1 multi-role', null, true),
  ('10000000-0000-4000-8000-000000000002', 'phase1-inactive@example.invalid', 'Phase 1 inactive', null, false),
  ('10000000-0000-4000-8000-000000000003', 'phase1-super@example.invalid', 'Phase 1 super admin', null, true),
  ('10000000-0000-4000-8000-000000000004', 'phase1-editor@example.invalid', 'Phase 1 managing editor', null, true),
  ('10000000-0000-4000-8000-000000000005', 'phase1-resource@example.invalid', 'Phase 1 resource editor', null, true),
  ('10000000-0000-4000-8000-000000000006', 'phase1-translator@example.invalid', 'Phase 1 translator', null, true),
  ('10000000-0000-4000-8000-000000000007', 'phase1-researcher@example.invalid', 'Phase 1 researcher', null, true);

insert into public.user_role_assignments (user_id, role_id)
select x.user_id::uuid, r.role_id
from (values
  ('10000000-0000-4000-8000-000000000001', 'moderator'),
  ('10000000-0000-4000-8000-000000000001', 'resource_editor'),
  ('10000000-0000-4000-8000-000000000002', 'super_admin'),
  ('10000000-0000-4000-8000-000000000003', 'super_admin'),
  ('10000000-0000-4000-8000-000000000004', 'managing_editor'),
  ('10000000-0000-4000-8000-000000000005', 'resource_editor'),
  ('10000000-0000-4000-8000-000000000006', 'translator'),
  ('10000000-0000-4000-8000-000000000007', 'researcher')
) x(user_id, role_name)
join public.roles r on r.name = x.role_name;

do $$
begin
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
  if not public.has_permission('submission.raw.read')
     or not public.has_permission('resource.edit') then
    raise exception 'multiple-role permission union failed';
  end if;
  if public.has_permission('submission.location.read') then
    raise exception 'moderator/resource editor gained location access';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
  if public.has_permission('admin.access') then
    raise exception 'deactivated user retained admin access';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
  if not public.has_permission('audit.read')
     or not public.has_permission('role.manage')
     or not public.has_permission('settings.manage') then
    raise exception 'super admin capability resolution failed';
  end if;
  if public.has_permission('podcast.manage') then
    raise exception 'legacy podcast.manage remains effective';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
  if not public.has_permission('podcast.edit')
     or not public.has_permission('podcast.publish')
     or public.has_permission('resource.edit') then
    raise exception 'managing editor least-privilege resolution failed';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
  if not public.has_permission('admin.access')
     or not public.has_permission('resource.import')
     or public.has_permission('submission.raw.read') then
    raise exception 'resource editor capability resolution failed';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
  if not public.has_permission('translation.edit')
     or public.has_permission('translation.approve') then
    raise exception 'translator capability resolution failed';
  end if;

  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000007', true);
  if not public.has_permission('research.export')
     or public.has_permission('submission.raw.read') then
    raise exception 'researcher capability resolution failed';
  end if;
end $$;

-- A direct PostgREST-equivalent table update must fail for authenticated staff.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

do $$
begin
  update public.raw_submissions set language_code = language_code;
  raise exception 'authenticated raw update unexpectedly succeeded';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  perform audit_id from audit.audit_log limit 1;
  raise exception 'authenticated audit read unexpectedly succeeded';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  insert into audit.audit_log(action) values ('forged.event');
  raise exception 'authenticated audit insert unexpectedly succeeded';
exception
  when insufficient_privilege then null;
end $$;

reset role;

-- An authorized reader uses only the gated function, never the table.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select count(*) from public.read_audit_events(1, null);

rollback;
