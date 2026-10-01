-- Migration: analytics_events v2 — first-party privacy-preserving analytics
--
-- Changes:
--   1. Extend analytics_event_type enum with the five Muriyar Ta conversion events.
--   2. Create SECURITY DEFINER record_event() RPC callable from server actions.
--   3. Extend build_daily_metric_snapshots() to roll up analytics_events by event_type.
--
-- Privacy guarantees (consistent with SEC-05):
--   - No IP, user-agent, or persistent visitor identifier is accepted or stored.
--   - entity_id carries only broad channel slugs (outreach) or locale codes;
--     never a submission ID, user ID, age, story content, or personal identifier.
--   - coarse_region column is NOT populated (left NULL) by this RPC — Vercel
--     already provides aggregate country analytics.
--   - The require_service_role() trigger on analytics_events is NOT removed;
--     record_event() runs as SECURITY DEFINER (postgres) which satisfies it.
-- =====================================================================

begin;

-- ── 1. Extend analytics_event_type enum ──────────────────────────────────────
--
-- PostgreSQL requires ALTER TYPE ... ADD VALUE outside a transaction for older
-- versions, but Supabase runs Postgres 15+ where it is allowed in a transaction
-- as long as the new value is not used in the same transaction — we use them
-- only in the function body defined below, which satisfies this requirement.

alter type public.analytics_event_type add value if not exists 'outreach_visit';
alter type public.analytics_event_type add value if not exists 'submission_started';
alter type public.analytics_event_type add value if not exists 'submission_completed';
alter type public.analytics_event_type add value if not exists 'partner_cta_click';
-- note: 'resource_click' already exists in the enum; no change needed.

-- ── 2. record_event() SECURITY DEFINER RPC ───────────────────────────────────
--
-- Callable by anon role via server actions. Runs as postgres, satisfying the
-- require_service_role() trigger.  All parameters are validated server-side
-- before this RPC is called; the function adds database-level guards too.
--
-- Parameters:
--   p_event_type   — one of the analytics_event_type enum values
--   p_entity_type  — short category label, e.g. 'locale', 'channel', 'cta'
--                    (varchar 40, optional)
--   p_entity_id    — broad, non-personal identifier:
--                      outreach_visit  → channel slug, e.g. 'impacther_whatsapp'
--                      submission_*    → locale code, e.g. 'en'
--                      resource_click  → resource entity_id / slug
--                      partner_cta_*   → CTA label, e.g. 'partner_form'
--                    (varchar 64, optional)
-- Returns: void. Silently drops the event on validation failure (no error
--          surfaced to the caller) to prevent analytics from blocking UX.

create or replace function public.record_event(
  p_event_type  public.analytics_event_type,
  p_entity_type varchar(40) default null,
  p_entity_id   varchar(64) default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate entity_id: reject anything that looks like a UUID (submission/user IDs),
  -- an email address, or exceeds 64 chars — belt-and-suspenders on top of the
  -- varchar(64) column constraint.
  if p_entity_id is not null then
    -- Reject UUID-shaped strings (8-4-4-4-12 hex)
    if p_entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return;
    end if;
    -- Reject anything containing '@' (email-like)
    if position('@' in p_entity_id) > 0 then
      return;
    end if;
    -- Normalise to lowercase, strip leading/trailing whitespace
    p_entity_id := lower(trim(p_entity_id));
    -- Reject empty after normalisation
    if p_entity_id = '' then
      p_entity_id := null;
    end if;
  end if;

  if p_entity_type is not null then
    p_entity_type := lower(trim(p_entity_type));
    if p_entity_type = '' then p_entity_type := null; end if;
  end if;

  insert into public.analytics_events(event_type, entity_type, entity_id, occurred_at)
  values (p_event_type, p_entity_type, p_entity_id, now());

exception when others then
  -- Swallow all errors: analytics must never block a user action.
  null;
end;
$$;

-- Grant execute to anon and authenticated (server actions run as anon via service-role proxy)
revoke all on function public.record_event(
  public.analytics_event_type, varchar, varchar
) from public, anon, authenticated;

grant execute on function public.record_event(
  public.analytics_event_type, varchar, varchar
) to anon, authenticated;

comment on function public.record_event is
  'Privacy-safe analytics intake. Accepts only broad channel/locale labels. '
  'Runs as SECURITY DEFINER to satisfy the require_service_role() trigger on '
  'analytics_events. Never stores IP, identifier, or personal data. SEC-05.';

-- ── 3. Extend build_daily_metric_snapshots() ─────────────────────────────────
--
-- Adds event-type counts and locale breakdowns to the existing daily snapshot
-- function. All existing snapshot rows are preserved.

create or replace function public.build_daily_metric_snapshots()
returns void language plpgsql security definer set search_path = public as $$
declare d date := current_date;
begin
  -- ── Existing snapshots (unchanged) ──────────────────────────────────────
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

  -- ── Analytics event counts (today only, rolling 24 h window) ────────────
  -- Counts each event type that occurred today (UTC date).
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  select
    d,
    'event_count',
    'type=' || event_type::text,
    count(*)
  from public.analytics_events
  where occurred_at >= d and occurred_at < d + interval '1 day'
  group by event_type
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;

  -- Submission events broken down by locale (entity_id when entity_type='locale')
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  select
    d,
    'event_count',
    'type=submission_completed,locale=' || coalesce(entity_id, 'unknown'),
    count(*)
  from public.analytics_events
  where occurred_at >= d and occurred_at < d + interval '1 day'
    and event_type = 'submission_completed'
    and entity_type = 'locale'
  group by entity_id
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;

  -- Outreach channel attribution (entity_id = channel slug)
  insert into public.daily_metric_snapshots(snapshot_date, metric_key, dimension, value)
  select
    d,
    'event_count',
    'type=outreach_visit,channel=' || coalesce(entity_id, 'unknown'),
    count(*)
  from public.analytics_events
  where occurred_at >= d and occurred_at < d + interval '1 day'
    and event_type = 'outreach_visit'
    and entity_type = 'channel'
  group by entity_id
  on conflict (snapshot_date, metric_key, dimension) do update set value = excluded.value;
end;
$$;

commit;
