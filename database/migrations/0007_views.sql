-- =====================================================================
-- Migration 0007 — Public Views
-- security_invoker = on  → the querying role's RLS still applies. The views
-- exist to (a) physically omit sensitive columns (notably source_submission_ref)
-- and (b) present clean, public-only projections of content.
-- =====================================================================

-- Published stories for public consumption — NEVER exposes source_submission_ref,
-- status, or published_by. Implements DAD §7 column-level separation.
create view public.published_stories_public
  with (security_invoker = on) as
select
  story_id, title, slug, body_text, language_code, region_id,
  featured_image_asset_id, read_time_minutes, seo_title, seo_description,
  author_display, is_featured, published_at
from public.published_stories
where status = 'published';

-- Published podcast episodes
create view public.podcast_episodes_public
  with (security_invoker = on) as
select
  episode_id, episode_number, title, description, audio_asset_id, external_audio_url,
  duration_seconds, transcript, cover_art_asset_id, language_code, streaming_links, published_at
from public.podcast_episodes
where status = 'published';

-- Active resource directory entries
create view public.resources_public
  with (security_invoker = on) as
select
  resource_id, name, description, category_id, website_url, contact_phone, contact_email,
  languages_supported, geographic_region_id, is_crisis_resource, last_verified_date
from public.resources
where status = 'active';

-- Crisis resources only (drives the prominent crisis module — PRD 21.2)
create view public.crisis_resources_public
  with (security_invoker = on) as
select resource_id, name, description, website_url, contact_phone, contact_email,
       languages_supported, geographic_region_id
from public.resources
where status = 'active' and is_crisis_resource;

-- Published reports
create view public.reports_public
  with (security_invoker = on) as
select report_id, title, description, issue_theme_tag_id, author_team, pdf_asset_id,
       language_code, download_count, published_at
from public.reports
where status = 'published';

-- Active team members
create view public.team_members_public
  with (security_invoker = on) as
select member_id, name_or_alias, role_title, bio_short, photo_asset_id, languages_spoken, sort_order
from public.team_members
where is_active
order by sort_order;

grant select on
  public.published_stories_public,
  public.podcast_episodes_public,
  public.resources_public,
  public.crisis_resources_public,
  public.reports_public,
  public.team_members_public
to anon, authenticated;
