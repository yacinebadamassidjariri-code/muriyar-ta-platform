-- =====================================================================
-- Migration 0006 — Index Strategy
-- PKs, UNIQUE constraints, and FK-backing uniques are already created with the
-- tables. The following indexes target the platform's hot read/filter paths
-- (moderation queue, public content listing, dashboards, retention sweeps).
-- =====================================================================

-- raw_submissions: moderation queue & retention sweeps
create index rs_state_idx          on public.raw_submissions (current_state);
create index rs_submitted_idx      on public.raw_submissions (submission_timestamp);
create index rs_language_idx       on public.raw_submissions (language_code);
create index rs_region_idx         on public.raw_submissions (region_id);
create index rs_assigned_idx       on public.raw_submissions (assigned_moderator_id);
create index rs_purge_idx          on public.raw_submissions (scheduled_purge_at) where scheduled_purge_at is not null;

-- published_stories: public blog listing & lookups
create index ps_status_pubat_idx   on public.published_stories (status, published_at desc);
create index ps_language_idx       on public.published_stories (language_code);
create index ps_region_idx         on public.published_stories (region_id);
create index ps_featured_idx       on public.published_stories (is_featured) where is_featured;

-- moderation trail
create index ma_submission_idx     on public.moderation_actions (submission_id, created_at);
create index ma_crisis_idx         on public.moderation_actions (is_crisis_flag) where is_crisis_flag;
create index se_submission_idx     on public.submission_edits (submission_id);

-- content
create index pod_status_idx        on public.podcast_episodes (status, published_at desc);
create index res_status_idx        on public.resources (status);
create index res_crisis_idx        on public.resources (is_crisis_resource) where is_crisis_resource;
create index res_category_idx      on public.resources (category_id);
create index rep_status_idx        on public.reports (status, published_at desc);

-- join tables (reverse-direction lookups)
create index pst_tag_idx           on public.published_story_tags (tag_id);
create index pet_tag_idx           on public.podcast_episode_tags (tag_id);
create index rt_tag_idx            on public.report_tags (tag_id);
create index pes_story_idx         on public.podcast_episode_stories (story_id);

-- taxonomy
create index geo_parent_idx        on public.geographic_regions (parent_region_id);

-- users / sessions / security
create index us_user_idx           on public.user_sessions (user_id);
create index la_email_idx          on public.login_attempts (email);
create index users_role_idx        on public.users (role_id);

-- engagement / partnerships
create index ni_type_idx           on public.partnership_inquiries (inquiry_type);
create index ni_status_idx         on public.partnership_inquiries (status);
create index ns_status_idx         on public.newsletter_subscribers (status);

-- analytics
create index ae_type_time_idx      on public.analytics_events (event_type, occurred_at);
