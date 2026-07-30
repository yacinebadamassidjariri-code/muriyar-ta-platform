-- =====================================================================
-- Migration 0004 — Functions (auth helpers, audit, business rules, retention, analytics)
-- =====================================================================

-- ---------- Authorization helpers (SECURITY DEFINER to avoid RLS recursion) ----------
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select r.name from public.users u
  join public.roles r on r.role_id = u.role_id
  where u.user_id = auth.uid() and u.is_active;
$$;

create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    join public.role_permissions rp on rp.role_id = u.role_id
    join public.permissions pm on pm.permission_id = rp.permission_id
    where u.user_id = auth.uid() and u.is_active and pm.code = p
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'administrator';
$$;

create or replace function public.is_editor_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('editor','administrator');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('moderator','editor','administrator');
$$;

grant execute on function public.current_app_role(), public.has_permission(text),
  public.is_admin(), public.is_editor_or_admin(), public.is_staff() to anon, authenticated;

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------- Submission intake guard ----------
-- Forces every new submission to PENDING and prevents any client from injecting
-- moderation state or moderator assignment at insert time (anonymity / integrity).
create or replace function public.enforce_submission_intake()
returns trigger language plpgsql as $$
begin
  new.current_state := 'PENDING';
  new.assigned_moderator_id := null;
  new.rejection_reason_code := null;
  new.scheduled_purge_at := null;
  return new;
end;
$$;

-- ---------- Rejection retention scheduling (SEC-21) ----------
-- When a submission transitions into REJECTED, schedule its purge for +90 days.
create or replace function public.schedule_rejection_purge()
returns trigger language plpgsql as $$
begin
  if new.current_state = 'REJECTED' and coalesce(old.current_state,'') <> 'REJECTED' then
    new.scheduled_purge_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

-- ---------- Audit logging ----------
create or replace function audit.scrub(j jsonb)
returns jsonb language sql immutable as $$
  -- Strip any column that could carry contributor PII or secrets.
  select j - 'body_text' - 'contact_email_encrypted' - 'statement_text' - 'message'
           - 'email' - 'email_encrypted' - 'twofa_secret' - 'password_hash'
           - 'previous_value' - 'new_value' - 'transcript';
$$;

create or replace function audit.log_change()
returns trigger language plpgsql security definer set search_path = public, audit as $$
declare pk text := tg_argv[0]; rec jsonb; eid text;
begin
  if (tg_op = 'DELETE') then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  eid := rec ->> pk;
  insert into audit.audit_log(actor_user_id, actor_role, action, entity_type, entity_id, metadata)
  values (auth.uid(), public.current_app_role(), tg_op || ' ' || tg_table_name,
          tg_table_name, eid, audit.scrub(rec));
  if (tg_op = 'DELETE') then return old; else return new; end if;
end;
$$;

-- ---------- Retention jobs (invoked by pg_cron in 0010) ----------
-- Purge rejected submissions and their private assets after 90 days (SEC-21).
create or replace function public.purge_rejected_submissions()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with del as (
    delete from public.raw_submissions
    where current_state = 'REJECTED'
      and scheduled_purge_at is not null
      and scheduled_purge_at <= now()
    returning voice_recording_asset_id
  )
  delete from public.media_assets m
  using del where del.voice_recording_asset_id = m.asset_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Delete contact emails within 30 days of resolution (SEC-22).
create or replace function public.purge_resolved_contact_emails()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.raw_submissions
    set contact_email_encrypted = null
    where contact_email_encrypted is not null
      and current_state in ('PUBLISHED','REJECTED','ARCHIVED')
      and updated_at < now() - interval '30 days';

  update public.partnership_inquiries
    set email = ''
    where email <> ''
      and status in ('responded','closed')
      and responded_at is not null
      and responded_at < now() - interval '30 days';
end;
$$;

-- Build daily aggregate metrics that power trends and the Founder Dashboard (PRD 16.3).
create or replace function public.build_daily_metric_snapshots()
returns void language plpgsql security definer set search_path = public as $$
declare d date := current_date;
begin
  -- Totals
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  values
    (d, 'submissions_total', '_all', (select count(*) from public.raw_submissions)),
    (d, 'published_total',   '_all', (select count(*) from public.published_stories where status='published')),
    (d, 'pending_count',     '_all', (select count(*) from public.raw_submissions where current_state='PENDING')),
    (d, 'rejected_count',    '_all', (select count(*) from public.raw_submissions where current_state='REJECTED')),
    (d, 'resources_active',  '_all', (select count(*) from public.resources where status='active')),
    (d, 'subscribers_confirmed','_all', (select count(*) from public.newsletter_subscribers where status='confirmed'))
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;

  -- Submissions by language
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  select d, 'submissions_total', 'language=' || language_code, count(*)
  from public.raw_submissions group by language_code
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;

  -- Moderation pipeline by state
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  select d, 'pipeline_count', 'state=' || current_state, count(*)
  from public.raw_submissions group by current_state
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;
end;
$$;
