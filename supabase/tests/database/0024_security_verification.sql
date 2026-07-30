-- Run only against a disposable or approved development database after 0024.
-- These catalog assertions are read-only and fail fast on privilege/policy drift.

begin read only;

do $$
declare mismatch integer;
begin
  select count(*) into mismatch
  from (values
    ('super_admin'), ('managing_editor'), ('moderator'),
    ('resource_editor'), ('translator'), ('researcher')
  ) expected(name)
  left join public.roles r on r.name = expected.name
  where r.role_id is null;
  if mismatch <> 0 then raise exception 'missing canonical roles: %', mismatch; end if;

  select count(*) into mismatch
  from (values
    ('admin.access'), ('submission.queue.read'), ('submission.raw.read'),
    ('submission.location.read'), ('submission.assign'), ('submission.review'),
    ('submission.disposition'), ('submission.escalate'), ('story.edit'),
    ('story.publish'), ('podcast.edit'), ('podcast.publish'), ('resource.edit'),
    ('resource.verify'), ('resource.import'), ('report.edit'), ('report.publish'),
    ('translation.edit'), ('translation.approve'), ('audit.read'),
    ('research.export'), ('user.manage'), ('role.manage'), ('settings.manage')
  ) expected(code)
  left join public.permissions p on p.code = expected.code
  where p.permission_id is null;
  if mismatch <> 0 then raise exception 'missing canonical capabilities: %', mismatch; end if;

  with canonical_capability(code) as (
    values
      ('admin.access'), ('submission.queue.read'), ('submission.raw.read'),
      ('submission.location.read'), ('submission.assign'), ('submission.review'),
      ('submission.disposition'), ('submission.escalate'), ('story.edit'),
      ('story.publish'), ('podcast.edit'), ('podcast.publish'), ('resource.edit'),
      ('resource.verify'), ('resource.import'), ('report.edit'), ('report.publish'),
      ('translation.edit'), ('translation.approve'), ('audit.read'),
      ('research.export'), ('user.manage'), ('role.manage'), ('settings.manage')
  ), expected(role_name, code) as (
    values
      ('managing_editor','admin.access'),
      ('managing_editor','submission.queue.read'),
      ('managing_editor','submission.raw.read'),
      ('managing_editor','submission.location.read'),
      ('managing_editor','submission.assign'),
      ('managing_editor','submission.review'),
      ('managing_editor','submission.disposition'),
      ('managing_editor','submission.escalate'),
      ('managing_editor','story.edit'),
      ('managing_editor','story.publish'),
      ('managing_editor','podcast.edit'),
      ('managing_editor','podcast.publish'),
      ('managing_editor','report.edit'),
      ('managing_editor','report.publish'),
      ('managing_editor','translation.edit'),
      ('managing_editor','translation.approve'),
      ('moderator','admin.access'),
      ('moderator','submission.queue.read'),
      ('moderator','submission.raw.read'),
      ('moderator','submission.review'),
      ('moderator','submission.disposition'),
      ('moderator','submission.escalate'),
      ('resource_editor','admin.access'),
      ('resource_editor','resource.edit'),
      ('resource_editor','resource.verify'),
      ('resource_editor','resource.import'),
      ('translator','admin.access'),
      ('translator','translation.edit'),
      ('researcher','admin.access'),
      ('researcher','research.export')
    union all
    select 'super_admin', code from canonical_capability
  ), actual as (
    select r.name::text as role_name, p.code::text as code
    from public.role_permissions rp
    join public.roles r on r.role_id = rp.role_id
    join public.permissions p on p.permission_id = rp.permission_id
    where r.name in (
      'super_admin', 'managing_editor', 'moderator',
      'resource_editor', 'translator', 'researcher'
    )
  )
  select count(*) into mismatch
  from expected e
  full join actual a
    on a.role_name = e.role_name and a.code = e.code
  where e.role_name is null or a.role_name is null;
  if mismatch <> 0 then raise exception 'canonical role matrix drift: %', mismatch; end if;

  if has_table_privilege('authenticated', 'public.raw_submissions', 'UPDATE')
     or has_table_privilege('authenticated', 'public.raw_submissions', 'INSERT')
     or has_table_privilege('authenticated', 'public.raw_submissions', 'DELETE')
     or has_table_privilege('authenticated', 'public.raw_submissions', 'SELECT') then
    raise exception 'authenticated retains direct raw_submissions DML';
  end if;

  if has_table_privilege('authenticated', 'audit.audit_log', 'SELECT')
     or has_table_privilege('authenticated', 'audit.audit_log', 'INSERT')
     or has_table_privilege('authenticated', 'audit.audit_log', 'UPDATE')
     or has_table_privilege('authenticated', 'audit.audit_log', 'DELETE') then
    raise exception 'authenticated retains direct audit access';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.raw_submissions'::regclass
      and tgname = 'protect_raw_submission_original' and not tgisinternal
  ) then raise exception 'raw submission immutability trigger missing'; end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'podcast_audio_capability_read'
      and qual like '%podcast.edit%'
  ) then raise exception 'private podcast audio policy not capability-gated'; end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'resources'
      and policyname = 'res_capability_write'
      and coalesce(qual, '') like '%resource.edit%'
      and coalesce(with_check, '') like '%resource.edit%'
  ) then raise exception 'resource writes are not resource.edit-gated'; end if;

  if exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.role_id = rp.role_id
    join public.permissions p on p.permission_id = rp.permission_id
    where r.name in (
      'super_admin', 'managing_editor', 'moderator',
      'resource_editor', 'translator', 'researcher'
    ) and p.code = 'podcast.manage'
  ) then raise exception 'legacy podcast.manage remains assigned'; end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'podcast_audio_authenticated_read',
        'podcast_artwork_authenticated_read'
      )
  ) then raise exception 'legacy generic authenticated media policy remains'; end if;

  if position(
    'encryption_unavailable' in
    pg_get_functiondef('public.submit_story(text,text,boolean,text,text,text)'::regprocedure)
  ) = 0 then raise exception 'story intake does not fail closed'; end if;

  if position(
    '20000' in
    pg_get_functiondef('public.submit_story(text,text,boolean,text,text,text)'::regprocedure)
  ) = 0 then raise exception 'server-side story maximum missing'; end if;

  if to_regprocedure('public.read_audit_events(integer,timestamptz)') is null then
    raise exception 'authorized audit reader missing';
  end if;
end $$;

rollback;
