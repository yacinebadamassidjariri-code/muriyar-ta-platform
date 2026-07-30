-- =====================================================================
-- Migration 0008 — Row Level Security (implements DAD §7, TAD §8)
-- Model: default-deny. anon may submit/subscribe/contact and read public
-- content; staff roles get scoped access; service_role bypasses RLS for jobs.
-- =====================================================================

-- ---------- Baseline grants (RLS is the actual gate) ----------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon may only INSERT on the three public write paths.
grant insert on public.raw_submissions, public.newsletter_subscribers,
                 public.partnership_inquiries, public.analytics_events to anon;

-- Defense-in-depth: remove anon SELECT on sensitive tables (RLS denies anyway).
revoke select on
  public.raw_submissions, public.submission_edits, public.moderation_actions,
  public.users, public.user_sessions, public.login_attempts,
  public.newsletter_subscribers, public.newsletter_campaigns, public.newsletter_campaign_metrics,
  public.partnership_inquiries, public.analytics_events, public.daily_metric_snapshots
from anon;

-- Enable RLS on every public table.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- =====================================================================
-- STORYTELLING CORE
-- =====================================================================
-- raw_submissions: anon/authenticated may INSERT (submit); no readback for anon.
create policy rs_insert_anon on public.raw_submissions
  for insert to anon with check (true);
create policy rs_insert_auth on public.raw_submissions
  for insert to authenticated with check (true);
-- Staff read: moderators see PENDING queue + their assignments; editors/admin see all.
create policy rs_select_staff on public.raw_submissions
  for select to authenticated using (
    public.is_editor_or_admin()
    or (public.current_app_role() = 'moderator'
        and (assigned_moderator_id = auth.uid() or current_state = 'PENDING'))
  );
-- Staff update (moderation): moderators on queue/assignment; editors/admin all.
create policy rs_update_staff on public.raw_submissions
  for update to authenticated using (
    public.is_editor_or_admin()
    or (public.current_app_role() = 'moderator'
        and (assigned_moderator_id = auth.uid() or current_state = 'PENDING'))
  ) with check (public.is_staff());
-- No DELETE policy: deletion happens only via the service-role retention job.

-- published_stories: public reads published rows; staff manage.
create policy ps_select_public on public.published_stories
  for select to anon, authenticated using (status = 'published');
create policy ps_select_staff on public.published_stories
  for select to authenticated using (public.is_staff());
create policy ps_write_editor on public.published_stories
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- submission_edits: staff insert/select; append-only (no update/delete policy).
create policy se_select_staff on public.submission_edits
  for select to authenticated using (public.is_staff());
create policy se_insert_staff on public.submission_edits
  for insert to authenticated with check (public.is_staff() and moderator_id = auth.uid());

-- moderation_actions: staff insert/select; append-only.
create policy ma_select_staff on public.moderation_actions
  for select to authenticated using (public.is_staff());
create policy ma_insert_staff on public.moderation_actions
  for insert to authenticated with check (public.is_staff() and moderator_id = auth.uid());

-- consent_versions / translations: public reads ACTIVE only (to render the form); admin manages.
create policy cv_select_active on public.consent_versions
  for select to anon, authenticated using (is_active);
create policy cv_admin_all on public.consent_versions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cvt_select_active on public.consent_version_translations
  for select to anon, authenticated using (exists (
    select 1 from public.consent_versions v
    where v.consent_version_id = consent_version_translations.consent_version_id and v.is_active));
create policy cvt_admin_all on public.consent_version_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- TAXONOMY / LOOKUPS — public read, admin manage
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['supported_languages','moderation_states','rejection_reason_codes',
                           'issue_tags','geographic_regions','resource_categories']
  loop
    execute format('create policy %1$s_read_all on public.%1$s for select to anon, authenticated using (true);', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- =====================================================================
-- CONTENT — public read of published/active; staff manage
-- =====================================================================
create policy pod_public on public.podcast_episodes
  for select to anon, authenticated using (status = 'published');
create policy pod_staff_read on public.podcast_episodes
  for select to authenticated using (public.is_staff());
create policy pod_editor on public.podcast_episodes
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy res_public on public.resources
  for select to anon, authenticated using (status = 'active');
create policy res_staff_read on public.resources
  for select to authenticated using (public.is_staff());
create policy res_editor on public.resources
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy rep_public on public.reports
  for select to anon, authenticated using (status = 'published');
create policy rep_staff_read on public.reports
  for select to authenticated using (public.is_staff());
create policy rep_editor on public.reports
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy tm_public on public.team_members
  for select to anon, authenticated using (is_active);
create policy tm_editor on public.team_members
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- Content join tables: public read (for tag/episode listings); editors manage.
do $$
declare t text;
begin
  foreach t in array array['podcast_episode_stories','published_story_tags','podcast_episode_tags','report_tags']
  loop
    execute format('create policy %1$s_read on public.%1$s for select to anon, authenticated using (true);', t);
    execute format('create policy %1$s_editor on public.%1$s for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());', t);
  end loop;
end $$;

-- media_assets: public can read PUBLIC asset metadata; staff manage.
create policy media_public on public.media_assets
  for select to anon, authenticated using (is_public);
create policy media_staff_read on public.media_assets
  for select to authenticated using (public.is_staff());
create policy media_editor on public.media_assets
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- =====================================================================
-- USERS & ACCESS
-- =====================================================================
create policy users_self_read on public.users
  for select to authenticated using (user_id = auth.uid());
create policy users_admin_all on public.users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- roles / permissions: readable by authenticated; managed by admin.
create policy roles_read on public.roles for select to authenticated using (true);
create policy roles_admin on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy perms_read on public.permissions for select to authenticated using (true);
create policy perms_admin on public.permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rp_admin on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rp_read on public.role_permissions for select to authenticated using (public.is_staff());

-- sessions / login attempts: self-read; admin all. Inserts via auth flow/service.
create policy sess_self on public.user_sessions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy sess_admin on public.user_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy la_admin on public.login_attempts
  for select to authenticated using (public.is_admin());

-- =====================================================================
-- NEWSLETTER
-- =====================================================================
-- Subscribe: anyone may INSERT a pending subscriber. No public readback.
create policy ns_insert on public.newsletter_subscribers
  for insert to anon, authenticated with check (status = 'pending');
create policy ns_admin on public.newsletter_subscribers
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

create policy nc_editor on public.newsletter_campaigns
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
create policy ncm_editor on public.newsletter_campaign_metrics
  for all to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

-- =====================================================================
-- PARTNERSHIPS / CONTACT
-- =====================================================================
create policy pi_insert on public.partnership_inquiries
  for insert to anon, authenticated with check (status = 'new');
create policy pi_admin_read on public.partnership_inquiries
  for select to authenticated using (public.is_admin());
create policy pi_admin_write on public.partnership_inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- ANALYTICS
-- =====================================================================
-- Non-identifying events may be inserted by clients/server; readable by staff only.
create policy ae_insert on public.analytics_events
  for insert to anon, authenticated with check (true);
create policy ae_staff_read on public.analytics_events
  for select to authenticated using (public.is_staff());

-- Aggregated snapshots: staff read (admin uses them for the Founder Dashboard).
-- Inserts/updates happen only via the service-role cron job (no policy needed).
create policy dms_staff_read on public.daily_metric_snapshots
  for select to authenticated using (public.is_staff());
