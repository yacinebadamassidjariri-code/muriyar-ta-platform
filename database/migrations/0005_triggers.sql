-- =====================================================================
-- Migration 0005 — Triggers
-- =====================================================================

-- ---------- updated_at on mutable tables ----------
create trigger trg_users_updated      before update on public.users               for each row execute function public.set_updated_at();
create trigger trg_rawsub_updated      before update on public.raw_submissions     for each row execute function public.set_updated_at();
create trigger trg_pubstory_updated    before update on public.published_stories   for each row execute function public.set_updated_at();
create trigger trg_podcast_updated     before update on public.podcast_episodes    for each row execute function public.set_updated_at();
create trigger trg_resources_updated   before update on public.resources           for each row execute function public.set_updated_at();
create trigger trg_reports_updated     before update on public.reports             for each row execute function public.set_updated_at();
create trigger trg_metrics_updated     before update on public.newsletter_campaign_metrics for each row execute function public.set_updated_at();

-- ---------- Submission intake & retention business rules ----------
create trigger trg_rawsub_intake
  before insert on public.raw_submissions
  for each row execute function public.enforce_submission_intake();

create trigger trg_rawsub_reject_purge
  before update on public.raw_submissions
  for each row execute function public.schedule_rejection_purge();

-- ---------- Audit triggers (SEC-13) ----------
-- Attached to administrative / configuration tables. Contributor narrative tables
-- (raw_submissions, submission_edits) are NOT audited here because the moderation
-- trail itself (moderation_actions, submission_edits) is the immutable record for them,
-- and audit.scrub would strip their content anyway.
create trigger aud_users        after insert or update or delete on public.users
  for each row execute function audit.log_change('user_id');
create trigger aud_roles        after insert or update or delete on public.roles
  for each row execute function audit.log_change('role_id');
create trigger aud_role_perms   after insert or update or delete on public.role_permissions
  for each row execute function audit.log_change('role_id');
create trigger aud_pubstory     after insert or update or delete on public.published_stories
  for each row execute function audit.log_change('story_id');
create trigger aud_podcast      after insert or update or delete on public.podcast_episodes
  for each row execute function audit.log_change('episode_id');
create trigger aud_resources    after insert or update or delete on public.resources
  for each row execute function audit.log_change('resource_id');
create trigger aud_reports      after insert or update or delete on public.reports
  for each row execute function audit.log_change('report_id');
create trigger aud_campaigns    after insert or update or delete on public.newsletter_campaigns
  for each row execute function audit.log_change('campaign_id');
create trigger aud_partnership  after insert or update or delete on public.partnership_inquiries
  for each row execute function audit.log_change('inquiry_id');
create trigger aud_consent      after insert or update or delete on public.consent_versions
  for each row execute function audit.log_change('consent_version_id');
