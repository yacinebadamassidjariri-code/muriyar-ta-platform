-- Migration: tighten record_event() entity_id validation
--
-- Replaces the loose UUID+email check with a strict slug allowlist:
-- entity_id must match ^[a-z0-9_-]{1,60}$ (lowercase alphanumeric,
-- underscore, hyphen, max 60 chars). This is the same pattern enforced
-- client-side in OutreachTracker.extractSlug and ResourceWebsiteLink.
--
-- Accepted entity_id values by event type:
--   outreach_visit    → broad channel/campaign slug only, e.g.
--                       'impacther_whatsapp', 'linkedin', 'qr_event',
--                       'launch_campaign'. Never a person-specific token.
--   submission_*      → locale code, e.g. 'en', 'fr', 'ha', 'zar'
--   resource_click    → broad category slug, e.g. 'legal_aid', 'crisis',
--                       'mental_health', 'uncategorised'. Never a resource
--                       name, ID, or URL.
--   partner_cta_click → CTA location label, e.g. 'partner_page',
--                       'about_page', 'insights_contact'
--
-- Rejected: UUIDs, email addresses, strings with spaces, strings longer
-- than 60 chars, empty strings after trimming. Events with a rejected
-- entity_id are silently dropped (analytics never blocks UX).
-- =====================================================================

begin;

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
  -- Validate entity_id against strict slug allowlist.
  -- Accepted: lowercase alphanumeric + underscore + hyphen, 1–60 chars.
  -- Rejected: UUIDs, emails, strings with spaces or special chars, empties.
  if p_entity_id is not null then
    p_entity_id := lower(trim(p_entity_id));
    if p_entity_id = '' or not (p_entity_id ~ '^[a-z0-9_-]{1,60}$') then
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

comment on function public.record_event is
  'Privacy-safe analytics intake. entity_id must be a broad slug matching '
  '^[a-z0-9_-]{1,60}$ — channel slugs, locale codes, category slugs, or CTA '
  'labels only. Runs as SECURITY DEFINER (postgres) to satisfy the '
  'require_service_role() trigger on analytics_events. SEC-05.';

commit;
