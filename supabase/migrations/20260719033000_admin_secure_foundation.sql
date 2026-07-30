-- Phase 1 — Secure administrative foundation and reconciliation.
--
-- This migration is intentionally idempotent at the object/data level so an
-- existing environment that received some legacy scripts through the SQL
-- editor can converge safely. It does not delete staff, submissions, media, or
-- audit records. Apply only after the rehearsal procedure in MIGRATIONS.md.

begin;

-- ---------------------------------------------------------------------------
-- Canonical roles, capabilities, and many-to-many assignments
-- ---------------------------------------------------------------------------

insert into public.roles (name, description) values
  ('super_admin', 'Founder-level platform administration with audited break-glass access.'),
  ('managing_editor', 'Manages editorial review and publication.'),
  ('moderator', 'Reviews assigned or escalated story submissions.'),
  ('resource_editor', 'Maintains and verifies the Resource Library.'),
  ('translator', 'Prepares and reviews assigned translations.'),
  ('researcher', 'Uses approved aggregate and de-identified research outputs.')
on conflict (name) do update set description = excluded.description;

insert into public.permissions (code, description) values
  ('admin.access', 'Enter the administrative application'),
  ('submission.queue.read', 'View the authorized moderation queue'),
  ('submission.raw.read', 'Read original narratives for assigned or escalated cases'),
  ('submission.location.read', 'Read optional broad geographic context with audit logging'),
  ('submission.assign', 'Assign a submission to a moderator'),
  ('submission.review', 'Review an assigned or escalated submission and add notes'),
  ('submission.disposition', 'Approve or reject an assigned submission'),
  ('submission.escalate', 'Escalate a submission for protected review'),
  ('story.edit', 'Edit de-identified story working content'),
  ('story.publish', 'Publish or unpublish an approved story'),
  ('podcast.edit', 'Create and edit podcast metadata and private media'),
  ('podcast.publish', 'Publish or unpublish podcast episodes'),
  ('resource.edit', 'Create and edit Resource Library records'),
  ('resource.verify', 'Verify Resource Library records'),
  ('resource.import', 'Run reviewed Resource Library imports'),
  ('report.edit', 'Create and edit research reports'),
  ('report.publish', 'Publish or unpublish research reports'),
  ('translation.edit', 'Create and edit assigned translations'),
  ('translation.approve', 'Approve translations for publication'),
  ('audit.read', 'Read protected audit events'),
  ('research.export', 'Create approved de-identified research exports'),
  ('user.manage', 'Invite and deactivate staff accounts'),
  ('role.manage', 'Assign and revoke staff roles'),
  ('settings.manage', 'Manage non-secret platform settings')
on conflict (code) do update set description = excluded.description;

alter table public.users alter column role_id drop not null;

create table if not exists public.user_role_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  role_id integer not null references public.roles(role_id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.users(user_id) on delete set null,
  revoked_at timestamptz,
  constraint user_role_assignments_revoked_after_assigned check (
    revoked_at is null or revoked_at >= assigned_at
  )
);

create unique index if not exists user_role_assignments_active_unique
  on public.user_role_assignments (user_id, role_id)
  where revoked_at is null;
create index if not exists user_role_assignments_user_active_idx
  on public.user_role_assignments (user_id, assigned_at)
  where revoked_at is null;

-- Preserve current staff access while moving legacy single roles to the new
-- canonical equivalents. Public/reader roles intentionally receive no admin
-- assignment.
insert into public.user_role_assignments (user_id, role_id, assigned_at)
select
  u.user_id,
  canonical.role_id,
  coalesce(u.created_at, now())
from public.users u
join public.roles legacy on legacy.role_id = u.role_id
join public.roles canonical on canonical.name = case legacy.name
  when 'administrator' then 'super_admin'
  when 'editor' then 'managing_editor'
  when 'moderator' then 'moderator'
  when 'super_admin' then 'super_admin'
  when 'managing_editor' then 'managing_editor'
  when 'resource_editor' then 'resource_editor'
  when 'translator' then 'translator'
  when 'researcher' then 'researcher'
end
where legacy.name in (
  'administrator', 'editor', 'moderator', 'super_admin',
  'managing_editor', 'resource_editor', 'translator', 'researcher'
)
on conflict (user_id, role_id) where revoked_at is null do nothing;

-- Deterministic least-privilege matrix for canonical roles only.
delete from public.role_permissions rp
using public.roles r
where r.role_id = rp.role_id
  and r.name in (
    'super_admin', 'managing_editor', 'moderator',
    'resource_editor', 'translator', 'researcher'
  );

with role_capability(role_name, capability) as (
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
)
insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from role_capability rc
join public.roles r on r.name = rc.role_name
join public.permissions p on p.code = rc.capability
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.role_id, p.permission_id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
  and p.code in (
    'admin.access', 'submission.queue.read', 'submission.raw.read',
    'submission.location.read', 'submission.assign', 'submission.review',
    'submission.disposition', 'submission.escalate', 'story.edit',
    'story.publish', 'podcast.edit', 'podcast.publish', 'resource.edit',
    'resource.verify', 'resource.import', 'report.edit', 'report.publish',
    'translation.edit', 'translation.approve', 'audit.read',
    'research.export', 'user.manage', 'role.manage', 'settings.manage'
  )
on conflict do nothing;

create or replace function public.current_app_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(r.name::text order by r.name), array[]::text[])
  from public.users u
  join public.user_role_assignments ura
    on ura.user_id = u.user_id and ura.revoked_at is null
  join public.roles r on r.role_id = ura.role_id
  where u.user_id = auth.uid() and u.is_active;
$$;

create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.user_role_assignments ura
      on ura.user_id = u.user_id and ura.revoked_at is null
    join public.role_permissions rp on rp.role_id = ura.role_id
    join public.permissions pm on pm.permission_id = rp.permission_id
    where u.user_id = auth.uid() and u.is_active and pm.code = p
  );
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.users u
  join public.user_role_assignments ura
    on ura.user_id = u.user_id and ura.revoked_at is null
  join public.roles r on r.role_id = ura.role_id
  where u.user_id = auth.uid() and u.is_active
  order by case r.name
    when 'super_admin' then 1
    when 'managing_editor' then 2
    when 'moderator' then 3
    when 'resource_editor' then 4
    when 'translator' then 5
    when 'researcher' then 6
    else 99
  end
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select 'super_admin' = any(public.current_app_roles());
$$;

create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_roles() && array['super_admin','managing_editor']::text[];
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('admin.access');
$$;

create or replace function public.get_my_admin_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user_id', u.user_id,
    'display_name', u.display_name,
    'is_active', u.is_active,
    'preferred_language', u.preferred_language,
    'roles', coalesce((
      select jsonb_agg(distinct r.name order by r.name)
      from public.user_role_assignments ura
      join public.roles r on r.role_id = ura.role_id
      where ura.user_id = u.user_id and ura.revoked_at is null
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct p.code order by p.code)
      from public.user_role_assignments ura
      join public.role_permissions rp on rp.role_id = ura.role_id
      join public.permissions p on p.permission_id = rp.permission_id
      where ura.user_id = u.user_id and ura.revoked_at is null
    ), '[]'::jsonb)
  )
  from public.users u
  where u.user_id = auth.uid();
$$;

revoke all on function public.current_app_roles() from public;
revoke all on function public.get_my_admin_context() from public;
grant execute on function public.current_app_roles(), public.get_my_admin_context()
  to authenticated;
grant execute on function public.current_app_role(), public.has_permission(text),
  public.is_admin(), public.is_editor_or_admin(), public.is_staff()
  to anon, authenticated;

alter table public.user_role_assignments enable row level security;
drop policy if exists user_role_assignments_self_read on public.user_role_assignments;
drop policy if exists user_role_assignments_manager_read on public.user_role_assignments;
create policy user_role_assignments_self_read on public.user_role_assignments
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_role_assignments_manager_read on public.user_role_assignments
  for select to authenticated using ((select public.has_permission('role.manage')));

grant select on public.user_role_assignments to authenticated;
revoke insert, update, delete on public.user_role_assignments from authenticated;

-- ---------------------------------------------------------------------------
-- Protected, trusted audit paths
-- ---------------------------------------------------------------------------

create schema if not exists audit;

create or replace function audit.scrub(j jsonb)
returns jsonb language sql immutable as $$
  select coalesce(j, '{}'::jsonb)
    - 'body_text' - 'body' - 'country' - 'region'
    - 'contact_email_encrypted' - 'contact_email' - 'email'
    - 'statement_text' - 'message' - 'note'
    - 'twofa_secret' - 'password_hash' - 'access_token' - 'refresh_token'
    - 'signed_url' - 'signedUrl' - 'storage_path'
    - 'previous_value' - 'new_value' - 'transcript' - 'raw_sql_error';
$$;

create or replace function audit.write_event(
  p_event_code text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_audit_id uuid;
begin
  if p_event_code is null
     or p_event_code !~ '^[a-z][a-z0-9_.]{2,119}$' then
    raise exception 'invalid_audit_event';
  end if;
  insert into audit.audit_log(
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), public.current_app_role(), p_event_code,
    left(p_entity_type, 60), left(p_entity_id, 64), audit.scrub(p_metadata)
  ) returning audit_id into v_audit_id;
  return v_audit_id;
end;
$$;

revoke all on schema audit from public, anon, authenticated;
revoke all on all tables in schema audit from public, anon, authenticated;
revoke all on all functions in schema audit from public, anon, authenticated;
revoke insert, update, delete on audit.audit_log from service_role;

create or replace function audit.log_change()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  pk text := tg_argv[0];
  record_json jsonb;
begin
  record_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  perform audit.write_event(
    'db.' || lower(tg_op) || '.' || tg_table_name,
    tg_table_name,
    record_json ->> pk,
    record_json
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Reconcile the incompatible legacy podcast-media audit function with the
-- canonical audit.audit_log schema.
create or replace function public.aud_podcast_media_assets_fn()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  perform audit.write_event(
    'podcast.media.' || lower(tg_op),
    'podcast_media_asset',
    coalesce(new.asset_id, old.asset_id)::text,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists aud_podcast_media_assets on public.podcast_media_assets;
create trigger aud_podcast_media_assets
  after insert or update or delete on public.podcast_media_assets
  for each row execute function public.aud_podcast_media_assets_fn();

create or replace function audit.log_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  perform audit.write_event(
    case
      when tg_op = 'INSERT' then 'access.role.assigned'
      when new.revoked_at is not null and old.revoked_at is null then 'access.role.revoked'
      else 'access.role.assignment_updated'
    end,
    'user_role_assignment',
    new.assignment_id::text,
    jsonb_build_object('target_user_id', new.user_id, 'role_id', new.role_id)
  );
  return new;
end;
$$;

drop trigger if exists audit_user_role_assignment on public.user_role_assignments;
create trigger audit_user_role_assignment
  after insert or update on public.user_role_assignments
  for each row execute function audit.log_role_assignment();

revoke all on function audit.log_change(), audit.log_role_assignment()
  from public, anon, authenticated;

create or replace function public.read_audit_events(
  p_limit integer default 100,
  p_before timestamptz default null
)
returns table (
  audit_id uuid,
  event_code varchar,
  actor_user_id uuid,
  actor_role varchar,
  entity_type varchar,
  entity_id varchar,
  metadata jsonb,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  if not public.has_permission('audit.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select a.audit_id, a.action, a.actor_user_id, a.actor_role,
         a.entity_type, a.entity_id, a.metadata, a.occurred_at
  from audit.audit_log a
  where p_before is null or a.occurred_at < p_before
  order by a.occurred_at desc, a.audit_id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 250);
end;
$$;

revoke all on function public.read_audit_events(integer, timestamptz) from public;
grant execute on function public.read_audit_events(integer, timestamptz)
  to authenticated;

create or replace function public.assign_user_role(
  p_user_id uuid,
  p_role_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, audit
as $$
declare v_role_id integer; v_assignment_id uuid;
begin
  if not public.has_permission('role.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select role_id into v_role_id from public.roles
  where name = p_role_name
    and name in ('super_admin','managing_editor','moderator','resource_editor','translator','researcher');
  if v_role_id is null or not exists (select 1 from public.users where user_id = p_user_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  insert into public.user_role_assignments(user_id, role_id, assigned_by)
  values (p_user_id, v_role_id, auth.uid())
  on conflict (user_id, role_id) where revoked_at is null
  do update set assigned_by = excluded.assigned_by
  returning assignment_id into v_assignment_id;
  return v_assignment_id;
end;
$$;

create or replace function public.revoke_user_role(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  if not public.has_permission('role.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.user_role_assignments
  set revoked_at = now()
  where assignment_id = p_assignment_id and revoked_at is null;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.assign_user_role(uuid, text) from public;
revoke all on function public.revoke_user_role(uuid) from public;
grant execute on function public.assign_user_role(uuid, text),
  public.revoke_user_role(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Immutable original submissions and fail-closed intake
-- ---------------------------------------------------------------------------

alter table public.raw_submissions
  add column if not exists is_escalated boolean not null default false,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_by uuid references public.users(user_id) on delete set null;

create or replace function public.protect_raw_submission_original()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.submission_id is distinct from old.submission_id
     or new.submission_type is distinct from old.submission_type
     or new.language_code is distinct from old.language_code
     or new.body_text is distinct from old.body_text
     or new.voice_recording_asset_id is distinct from old.voice_recording_asset_id
     or new.country is distinct from old.country
     or new.region is distinct from old.region
     or new.region_id is distinct from old.region_id
     or new.consent_given is distinct from old.consent_given
     or new.consent_version_id is distinct from old.consent_version_id
     or new.consent_timestamp is distinct from old.consent_timestamp
     or new.consent_language is distinct from old.consent_language
     or new.submission_timestamp is distinct from old.submission_timestamp
     or new.char_count is distinct from old.char_count
     or new.created_at is distinct from old.created_at then
    raise exception 'original_submission_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_raw_submission_original on public.raw_submissions;
create trigger protect_raw_submission_original
  before update on public.raw_submissions
  for each row execute function public.protect_raw_submission_original();

drop policy if exists rs_select_staff on public.raw_submissions;
drop policy if exists rs_update_staff on public.raw_submissions;
drop policy if exists rs_insert_anon on public.raw_submissions;
drop policy if exists rs_insert_auth on public.raw_submissions;
revoke select, insert, update, delete on public.raw_submissions from anon, authenticated;

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
      and (r.assigned_moderator_id = auth.uid() or r.is_escalated)
  );
$$;

revoke all on function public.can_access_submission(uuid) from public;
grant execute on function public.can_access_submission(uuid) to authenticated;

drop policy if exists se_select_staff on public.submission_edits;
drop policy if exists se_select_authorized on public.submission_edits;
create policy se_select_authorized on public.submission_edits
  for select to authenticated
  using ((select public.can_access_submission(submission_id)));
drop policy if exists ma_select_staff on public.moderation_actions;
drop policy if exists ma_select_authorized on public.moderation_actions;
create policy ma_select_authorized on public.moderation_actions
  for select to authenticated
  using ((select public.can_access_submission(submission_id)));

create or replace function public.protect_story_source_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.source_submission_ref is distinct from old.source_submission_ref then
    raise exception 'source_submission_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_story_source_reference on public.published_stories;
create trigger protect_story_source_reference
  before update on public.published_stories
  for each row execute function public.protect_story_source_reference();

create or replace function public._decrypt_submission_body(p_body bytea)
returns text
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare v_key text;
begin
  if p_body is null then return null; end if;
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'story_body_key' limit 1;
  if nullif(v_key, '') is null then
    raise exception 'encryption_unavailable' using errcode = '55000';
  end if;
  begin
    return pgp_sym_decrypt(p_body, v_key);
  exception when others then
    raise exception 'decryption_failed' using errcode = '22000';
  end;
end;
$$;
revoke all on function public._decrypt_submission_body(bytea) from public, anon, authenticated;

create or replace function public.submit_story(
  p_body text,
  p_language_code text,
  p_consent boolean,
  p_consent_language text default null,
  p_country text default null,
  p_region text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_consent_version_id integer;
  v_story text := btrim(coalesce(p_body, ''));
  v_country text := nullif(btrim(coalesce(p_country, '')), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_key text;
begin
  if coalesce(p_consent, false) is not true then
    raise exception 'consent_required' using errcode = '23514';
  end if;
  if char_length(v_story) < 50 then raise exception 'too_short' using errcode = '23514'; end if;
  if char_length(v_story) > 20000 then raise exception 'too_long' using errcode = '22001'; end if;
  if char_length(v_country) > 100 then raise exception 'country_too_long' using errcode = '22001'; end if;
  if char_length(v_region) > 100 then raise exception 'region_too_long' using errcode = '22001'; end if;
  if not exists (
    select 1 from public.supported_languages
    where language_code = p_language_code and is_active
  ) then raise exception 'unsupported_language' using errcode = '23503'; end if;

  select consent_version_id into v_consent_version_id
  from public.consent_versions where is_active
  order by effective_from desc limit 1;
  if v_consent_version_id is null then raise exception 'no_active_consent'; end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'story_body_key' limit 1;
  if nullif(v_key, '') is null then
    raise exception 'encryption_unavailable' using errcode = '55000';
  end if;

  insert into public.raw_submissions(
    submission_type, language_code, body_text, country, region,
    consent_given, consent_version_id, consent_timestamp, consent_language,
    submission_timestamp, char_count
  ) values (
    'text', p_language_code, pgp_sym_encrypt(v_story, v_key), v_country, v_region,
    true, v_consent_version_id, now(), coalesce(p_consent_language, p_language_code),
    now(), char_length(v_story)
  );
end;
$$;

revoke all on function public.submit_story(text, text, boolean, text, text, text) from public;
grant execute on function public.submit_story(text, text, boolean, text, text, text)
  to anon, authenticated;

create or replace function public.assign_submission(
  p_submission_id uuid,
  p_assignee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  if not public.has_permission('submission.assign') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.users u
    where u.user_id = p_assignee_id and u.is_active
      and exists (
        select 1 from public.user_role_assignments ura
        join public.role_permissions rp on rp.role_id = ura.role_id
        join public.permissions p on p.permission_id = rp.permission_id
        where ura.user_id = u.user_id and ura.revoked_at is null
          and p.code = 'submission.review'
      )
  ) then raise exception 'invalid_assignee' using errcode = '22023'; end if;
  update public.raw_submissions
  set assigned_moderator_id = p_assignee_id,
      current_state = case when current_state = 'PENDING' then 'IN_REVIEW' else current_state end
  where submission_id = p_submission_id
    and current_state in ('PENDING','IN_REVIEW','NEEDS_EDIT');
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event(
    'submission.assigned', 'submission', p_submission_id::text,
    jsonb_build_object('assignee_id', p_assignee_id)
  );
end;
$$;

create or replace function public.escalate_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  if not public.has_permission('submission.escalate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.raw_submissions
  set is_escalated = true, escalated_at = now(), escalated_by = auth.uid()
  where submission_id = p_submission_id
    and (assigned_moderator_id = auth.uid()
      or public.has_permission('submission.assign'));
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event('submission.escalated', 'submission', p_submission_id::text, '{}'::jsonb);
end;
$$;

revoke all on function public.assign_submission(uuid, uuid),
  public.escalate_submission(uuid) from public;
grant execute on function public.assign_submission(uuid, uuid),
  public.escalate_submission(uuid) to authenticated;

-- PostgreSQL cannot replace a function with a different OUT row shape.
drop function if exists public.review_get_submission(uuid);
create function public.review_get_submission(p_submission_id uuid)
returns table (
  submission_id uuid,
  language_code varchar,
  submission_timestamp timestamptz,
  char_count integer,
  current_state varchar,
  issue_tag_id integer,
  assigned_moderator_id uuid,
  consent_given boolean,
  consent_version_id integer,
  consent_timestamp timestamptz,
  consent_language varchar,
  rejection_reason_code varchar,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  body text
)
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype;
begin
  if not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into r from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event('submission.raw.read', 'submission', p_submission_id::text, '{}'::jsonb);
  return query select
    r.submission_id, r.language_code, r.submission_timestamp, r.char_count,
    r.current_state, r.issue_tag_id, r.assigned_moderator_id,
    r.consent_given, r.consent_version_id, r.consent_timestamp,
    r.consent_language, r.rejection_reason_code, r.created_at, r.updated_at,
    r.resolved_at, public._decrypt_submission_body(r.body_text);
end;
$$;

create or replace function public.review_get_submission_location(
  p_submission_id uuid,
  p_access_reason text
)
returns table (country text, region text, region_id integer)
language plpgsql
security definer
set search_path = public, audit
as $$
begin
  if not public.has_permission('submission.location.read')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_access_reason is null or p_access_reason !~ '^[a-z][a-z0-9_]{2,39}$' then
    raise exception 'invalid_access_reason' using errcode = '22023';
  end if;
  perform audit.write_event(
    'submission.location.read', 'submission', p_submission_id::text,
    jsonb_build_object('reason_code', p_access_reason)
  );
  return query select r.country, r.region, r.region_id
  from public.raw_submissions r where r.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.review_get_submission_break_glass(
  p_submission_id uuid,
  p_reason_code text
)
returns table (
  submission_id uuid,
  language_code varchar,
  submission_timestamp timestamptz,
  char_count integer,
  current_state varchar,
  issue_tag_id integer,
  assigned_moderator_id uuid,
  consent_given boolean,
  consent_version_id integer,
  consent_timestamp timestamptz,
  consent_language varchar,
  rejection_reason_code varchar,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  body text
)
language plpgsql
security definer
set search_path = public, audit
as $$
declare r public.raw_submissions%rowtype;
begin
  if not public.is_admin() or not public.has_permission('submission.raw.read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code !~ '^break_glass_[a-z0-9_]{3,28}$' then
    raise exception 'invalid_access_reason' using errcode = '22023';
  end if;
  select * into r from public.raw_submissions
  where raw_submissions.submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  perform audit.write_event(
    'submission.raw.break_glass', 'submission', p_submission_id::text,
    jsonb_build_object('reason_code', p_reason_code)
  );
  return query select
    r.submission_id, r.language_code, r.submission_timestamp, r.char_count,
    r.current_state, r.issue_tag_id, r.assigned_moderator_id,
    r.consent_given, r.consent_version_id, r.consent_timestamp,
    r.consent_language, r.rejection_reason_code, r.created_at, r.updated_at,
    r.resolved_at, public._decrypt_submission_body(r.body_text);
end;
$$;

revoke all on function public.review_get_submission(uuid),
  public.review_get_submission_location(uuid, text),
  public.review_get_submission_break_glass(uuid, text) from public;
grant execute on function public.review_get_submission(uuid),
  public.review_get_submission_location(uuid, text),
  public.review_get_submission_break_glass(uuid, text) to authenticated;

create or replace function public.review_set_disposition(
  p_submission_id uuid,
  p_action text,
  p_reason_code varchar default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from varchar;
  v_to varchar;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_permission('submission.disposition')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;
  select current_state into v_from from public.raw_submissions
  where submission_id = p_submission_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if v_from not in ('PENDING', 'IN_REVIEW') then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if p_action = 'reject' then
    if p_reason_code is null or not exists (
      select 1 from public.rejection_reason_codes where reason_code = p_reason_code
    ) then raise exception 'reason_required' using errcode = '23503'; end if;
    v_to := 'REJECTED';
  else
    v_to := 'APPROVED';
  end if;
  update public.raw_submissions
  set current_state = v_to,
      rejection_reason_code = case when p_action = 'reject'
        then p_reason_code else null end
  where submission_id = p_submission_id;
  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, auth.uid(), p_action::public.moderation_action_type,
    v_from, v_to, v_note, false
  );
  return v_to;
end;
$$;

create or replace function public.review_add_note(
  p_submission_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state varchar;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if not public.has_permission('submission.review')
     or not public.can_access_submission(p_submission_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null then raise exception 'note_required' using errcode = '23514'; end if;
  if char_length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;
  select current_state into v_state from public.raw_submissions
  where submission_id = p_submission_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions(
    submission_id, moderator_id, action_type, from_state, to_state, note, is_crisis_flag
  ) values (
    p_submission_id, auth.uid(), 'note'::public.moderation_action_type,
    v_state, v_state, v_note, false
  ) returning action_id into v_id;
  return v_id;
end;
$$;

revoke all on function public.review_set_disposition(uuid, text, varchar, text),
  public.review_add_note(uuid, text) from public;
grant execute on function public.review_set_disposition(uuid, text, varchar, text),
  public.review_add_note(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Capability-based content and private Storage access
-- ---------------------------------------------------------------------------

drop policy if exists pod_staff_read on public.podcast_episodes;
drop policy if exists pod_editor on public.podcast_episodes;
drop policy if exists pod_editor_read on public.podcast_episodes;
create policy pod_editor_read on public.podcast_episodes
  for select to authenticated using ((select public.has_permission('podcast.edit')));
-- Direct writes remain denied; the narrow podcast RPCs are the write path.
revoke insert, update, delete on public.podcast_episodes from authenticated;

drop policy if exists pma_staff_select on public.podcast_media_assets;
drop policy if exists pma_staff_insert on public.podcast_media_assets;
drop policy if exists pma_staff_update on public.podcast_media_assets;
drop policy if exists pma_staff_delete on public.podcast_media_assets;
drop policy if exists pma_editor_read on public.podcast_media_assets;
create policy pma_editor_read on public.podcast_media_assets
  for select to authenticated using ((select public.has_permission('podcast.edit')));
revoke insert, update, delete on public.podcast_media_assets from authenticated;

-- Reconcile the remaining content policies that previously inferred access
-- from the legacy single editor role. Canonical capabilities are the only
-- write boundary for these models.
drop policy if exists res_staff_read on public.resources;
drop policy if exists res_editor on public.resources;
drop policy if exists res_capability_read on public.resources;
drop policy if exists res_capability_write on public.resources;
create policy res_capability_read on public.resources
  for select to authenticated using (
    (select public.has_permission('resource.edit'))
    or (select public.has_permission('resource.verify'))
    or (select public.has_permission('resource.import'))
  );
create policy res_capability_write on public.resources
  for all to authenticated
  using ((select public.has_permission('resource.edit')))
  with check ((select public.has_permission('resource.edit')));

drop policy if exists rca_editor on public.resource_category_assignments;
drop policy if exists rca_capability_write on public.resource_category_assignments;
create policy rca_capability_write on public.resource_category_assignments
  for all to authenticated
  using ((select public.has_permission('resource.edit')))
  with check ((select public.has_permission('resource.edit')));

drop policy if exists rep_staff_read on public.reports;
drop policy if exists rep_editor on public.reports;
drop policy if exists rep_capability_read on public.reports;
drop policy if exists rep_capability_write on public.reports;
create policy rep_capability_read on public.reports
  for select to authenticated using (
    (select public.has_permission('report.edit'))
    or (select public.has_permission('report.publish'))
  );
create policy rep_capability_write on public.reports
  for all to authenticated
  using ((select public.has_permission('report.edit')))
  with check ((select public.has_permission('report.edit')));

drop policy if exists ps_select_staff on public.published_stories;
drop policy if exists ps_write_editor on public.published_stories;
drop policy if exists ps_capability_read on public.published_stories;
drop policy if exists ps_capability_write on public.published_stories;
create policy ps_capability_read on public.published_stories
  for select to authenticated using (
    (select public.has_permission('story.edit'))
    or (select public.has_permission('story.publish'))
  );
create policy ps_capability_write on public.published_stories
  for all to authenticated
  using ((select public.has_permission('story.edit')))
  with check ((select public.has_permission('story.edit')));

drop policy if exists "podcast_audio_authenticated_read" on storage.objects;
drop policy if exists "podcast_artwork_authenticated_read" on storage.objects;
drop policy if exists "podcast_audio_capability_read" on storage.objects;
drop policy if exists "podcast_artwork_capability_read" on storage.objects;
create policy "podcast_audio_capability_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'podcast-audio' and (select public.has_permission('podcast.edit')));
create policy "podcast_artwork_capability_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'podcast-artwork' and (select public.has_permission('podcast.edit')));

drop policy if exists "private read staff" on storage.objects;
drop policy if exists "private write staff" on storage.objects;
drop policy if exists "private manage admin" on storage.objects;
drop policy if exists "private_submission_assigned_read" on storage.objects;
create or replace function public.storage_submission_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = public, storage
as $$
declare v_segment text;
begin
  v_segment := (storage.foldername(p_name))[1];
  if v_segment is null or v_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_segment::uuid;
exception when others then
  return null;
end;
$$;
revoke all on function public.storage_submission_id(text) from public;
grant execute on function public.storage_submission_id(text) to authenticated;

create policy "private_submission_assigned_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-submissions'
    and public.can_access_submission(public.storage_submission_id(name))
  );

-- Recreate publish/unpublish RPCs so already-running databases adopt the
-- canonical podcast.publish capability instead of legacy podcast.manage/edit.
create or replace function public.publish_podcast_episode(
  p_episode_id uuid,
  p_payload    jsonb default '{}'::jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row  public.podcast_episodes%rowtype;
begin
  ----------------------------------------------------------------------
  -- Permission & lock first (so state can't race).
  ----------------------------------------------------------------------
  if not public.has_permission('podcast.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- We need to validate state BEFORE running the (possibly extensive)
  -- save flow, so check the row exists and is a draft first.
  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'draft' then
    raise exception 'podcast_not_draft' using errcode = '22023';
  end if;

  ----------------------------------------------------------------------
  -- Apply payload via the draft RPC (full payload validation, no status change).
  -- If anything is wrong, the inner RAISE bubbles up unchanged.
  ----------------------------------------------------------------------
  perform public.save_podcast_episode_draft(p_episode_id, coalesce(p_payload, '{}'::jsonb));

  -- Re-read the row with the saved changes.
  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;

  ----------------------------------------------------------------------
  -- Publication-required metadata. Any missing/invalid field raises with
  -- the same error code that save would have raised, so the UI maps it
  -- uniformly. (Title and advisory are NOT NULL via Save above; slug,
  -- language, series, kind we must explicitly require here.)
  ----------------------------------------------------------------------
  if v_row.title is null or char_length(v_row.title) = 0 then
    raise exception 'title_required' using errcode = '23514';
  end if;
  if v_row.slug is null then
    raise exception 'slug_format' using errcode = '23514';
  end if;
  if v_row.language_code is null then
    raise exception 'unsupported_language' using errcode = '23503';
  end if;
  if v_row.series_slug is null then
    raise exception 'podcast_invalid_series' using errcode = '23503';
  end if;
  if v_row.episode_kind is null then
    raise exception 'podcast_invalid_kind' using errcode = '22023';
  end if;

  ----------------------------------------------------------------------
  -- Transition to published. Stamps the first-publication fields.
  ----------------------------------------------------------------------
  update public.podcast_episodes
  set
    status        = 'published',
    published_at  = now(),
    published_by  = v_user
  where episode_id = p_episode_id;

  return 'published';
end;
$$;

revoke all on function public.publish_podcast_episode(uuid, jsonb) from public;
grant execute on function public.publish_podcast_episode(uuid, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- 5) unpublish_podcast_episode
--    Pure state transition (no payload). State gate: must be 'published'.
--    Defensively clears is_featured before flipping status, to avoid the
--    pod_featured_requires_published_chk CHECK firing on the UPDATE.
--    Preserves published_at/published_by as a historical record of the
--    first publication event.
-- ---------------------------------------------------------------------
create or replace function public.unpublish_podcast_episode(
  p_episode_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.podcast_episodes%rowtype;
begin
  if not public.has_permission('podcast.publish') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row
  from public.podcast_episodes
  where episode_id = p_episode_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_row.status <> 'published' then
    raise exception 'podcast_not_published' using errcode = '22023';
  end if;

  -- Defensive: clear is_featured BEFORE changing status so the CHECK
  -- constraint pod_featured_requires_published_chk never fires as an
  -- opaque error mid-update.
  update public.podcast_episodes
  set
    is_featured = false,
    status      = 'draft'
  where episode_id = p_episode_id;

  return 'draft';
end;
$$;

revoke all on function public.unpublish_podcast_episode(uuid) from public;
grant execute on function public.unpublish_podcast_episode(uuid) to authenticated;


-- Legacy podcast.manage is no longer a usable authorization shortcut.
delete from public.role_permissions rp
using public.permissions p
where p.permission_id = rp.permission_id and p.code = 'podcast.manage';

commit;
